import { Injectable, Logger, OnModuleDestroy, OnModuleInit, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import { basename, join, resolve } from "path";

type MongoCollection = {
  createIndex: (keys: Record<string, unknown>, options?: Record<string, unknown>) => Promise<unknown>;
  dropIndex?: (indexName: string) => Promise<unknown>;
  updateOne: (
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
    options?: Record<string, unknown>,
  ) => Promise<unknown>;
  insertOne: (doc: Record<string, unknown>) => Promise<unknown>;
  findOne: (filter: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
  find: (filter: Record<string, unknown>, options?: Record<string, unknown>) => {
    sort: (sort: Record<string, 1 | -1>) => {
      limit: (limit: number) => {
        toArray: () => Promise<Array<Record<string, unknown>>>;
      };
      toArray: () => Promise<Array<Record<string, unknown>>>;
    };
    limit: (limit: number) => { toArray: () => Promise<Array<Record<string, unknown>>> };
    toArray: () => Promise<Array<Record<string, unknown>>>;
  };
  deleteOne: (filter: Record<string, unknown>) => Promise<unknown>;
};

type MongoDb = {
  collection: (name: string) => MongoCollection;
};

type MongoClientLike = {
  connect: () => Promise<void>;
  db: (name: string) => MongoDb;
  close: () => Promise<void>;
};

export interface ArchiveAttachmentInput {
  filename: string;
  contentType?: string;
  dataBase64?: string;
}

export interface ArchiveAttachment {
  id: string;
  filename: string;
  originalFilename: string;
  contentType: string;
  sizeBytes: number;
  storagePath: string;
}

export interface ArchiveMessageInput {
  workspaceId?: string | null;
  mailbox: string;
  mailboxId?: string | null;
  folder: string;
  uid?: string | number | null;
  messageId?: string | null;
  inReplyTo?: string | null;
  references?: string[];
  from: string;
  to?: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  text: string;
  html?: string;
  date?: Date | string | null;
  seen?: boolean;
  flagged?: boolean;
  status?: "received" | "draft" | "queued" | "sending" | "sent" | "failed";
  direction: "inbound" | "outbound";
  rawPreview?: string;
  attachments?: ArchiveAttachmentInput[];
  error?: string | null;
}

export interface MailListFilter {
  workspaceId?: string | null;
  mailbox: string;
  folder?: string;
  search?: string;
  from?: string;
  to?: string;
  subject?: string;
  since?: string;
  before?: string;
  unreadOnly?: boolean;
  flaggedOnly?: boolean;
  attachmentsOnly?: boolean;
  limit?: number;
}

@Injectable()
export class MongoMailService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MongoMailService.name);
  private readonly uri?: string;
  private readonly dbName: string;
  private readonly attachmentRoot: string;
  private client?: MongoClientLike;
  private db?: MongoDb;
  private mongoImport?: Promise<{ MongoClient: new (uri: string) => MongoClientLike }>;

  constructor(config: ConfigService) {
    this.uri = config.get<string>("MONGODB_URI");
    this.dbName = config.get<string>("MONGODB_DB", "yetrix_mail");
    this.attachmentRoot = resolve(
      config.get<string>(
        "MAIL_ATTACHMENT_DIR",
        config.get<string>("LOCAL_MAIL_STORAGE_DIR", join(process.cwd(), "storage", "mail-attachments")),
      ),
    );
  }

  get enabled() {
    return Boolean(this.db);
  }

  async onModuleInit() {
    if (!this.uri) {
      this.logger.warn("MONGODB_URI is not configured; Mongo mail archive is disabled");
      return;
    }

    try {
      const { MongoClient } = await this.loadMongo();
      this.client = new MongoClient(this.uri);
      await this.client.connect();
      this.db = this.client.db(this.dbName);
      await this.ensureIndexes();
      await fs.mkdir(this.attachmentRoot, { recursive: true });
      this.logger.log(`Mongo mail archive connected to ${this.dbName}`);
    } catch (error) {
      this.logger.error(
        `Mongo mail archive is disabled: ${error instanceof Error ? error.message : String(error)}`,
      );
      this.client = undefined;
      this.db = undefined;
    }
  }

  async onModuleDestroy() {
    await this.client?.close();
  }

  async upsertMailbox(input: {
    workspaceId?: string | null;
    mailbox: string;
    mailboxId?: string | null;
    name?: string | null;
    status?: string;
  }) {
    const collection = this.collection("mailboxes");
    const now = new Date();
    await collection.updateOne(
      { mailbox: input.mailbox.toLowerCase(), workspaceId: input.workspaceId ?? null },
      {
        $set: {
          workspaceId: input.workspaceId ?? null,
          mailbox: input.mailbox.toLowerCase(),
          mailboxId: input.mailboxId ?? null,
          name: input.name ?? null,
          status: input.status ?? "active",
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );
  }

  async recordFolder(input: { workspaceId?: string | null; mailbox: string; path: string; name: string }) {
    const collection = this.collection("folders");
    const now = new Date();
    await collection.updateOne(
      {
        workspaceId: input.workspaceId ?? null,
        mailbox: input.mailbox.toLowerCase(),
        path: input.path,
      },
      {
        $set: {
          workspaceId: input.workspaceId ?? null,
          mailbox: input.mailbox.toLowerCase(),
          path: input.path,
          name: input.name,
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );
  }

  async upsertSyncedMessage(input: ArchiveMessageInput) {
    const existing = await this.findExistingMessage(input);
    const id = this.stringValue(existing?.id) ?? randomUUID();
    const attachments = await this.storeAttachments({
      workspaceId: input.workspaceId ?? null,
      mailbox: input.mailbox,
      messageId: id,
      attachments: input.attachments ?? [],
    });
    const now = new Date();
    const doc = this.messageDocument(input, id, attachments, now);

    await this.collection("messages").updateOne(
      {
        workspaceId: input.workspaceId ?? null,
        mailbox: input.mailbox.toLowerCase(),
        folder: input.folder,
        uid: input.uid == null ? null : String(input.uid),
      },
      {
        $set: {
          ...doc,
          updatedAt: now,
        },
        $setOnInsert: {
          id,
          createdAt: now,
        },
      },
      { upsert: true },
    );

    await this.persistAttachmentMetadata(input.workspaceId ?? null, input.mailbox, id, attachments);
    await this.persistConversation(input, id, now);
    return id;
  }

  async createOutgoingQueued(input: ArchiveMessageInput) {
    const id = randomUUID();
    const attachments = await this.storeAttachments({
      workspaceId: input.workspaceId ?? null,
      mailbox: input.mailbox,
      messageId: id,
      attachments: input.attachments ?? [],
    });
    const now = new Date();
    const doc = this.messageDocument(
      {
        ...input,
        folder: input.folder || "Sent",
        status: input.status ?? "queued",
        direction: "outbound",
        seen: true,
      },
      id,
      attachments,
      now,
    );

    await this.collection("messages").insertOne({
      ...doc,
      id,
      createdAt: now,
      updatedAt: now,
      queuedAt: now,
    });
    await this.persistAttachmentMetadata(input.workspaceId ?? null, input.mailbox, id, attachments);
    await this.persistConversation(input, id, now);
    return { id, attachments };
  }

  async saveDraft(input: ArchiveMessageInput) {
    const id = randomUUID();
    const attachments = await this.storeAttachments({
      workspaceId: input.workspaceId ?? null,
      mailbox: input.mailbox,
      messageId: id,
      attachments: input.attachments ?? [],
    });
    const now = new Date();
    const doc = this.messageDocument(
      {
        ...input,
        folder: "Drafts",
        status: "draft",
        direction: "outbound",
        seen: true,
      },
      id,
      attachments,
      now,
    );
    await this.collection("messages").insertOne({
      ...doc,
      id,
      createdAt: now,
      updatedAt: now,
    });
    await this.persistAttachmentMetadata(input.workspaceId ?? null, input.mailbox, id, attachments);
    await this.persistConversation(input, id, now);
    return { id, attachments };
  }

  async updateMessageStatus(id: string, status: "queued" | "sending" | "sent" | "failed", error?: string) {
    const now = new Date();
    const fields: Record<string, unknown> = {
      status,
      updatedAt: now,
    };
    if (status === "sending") fields.sendingAt = now;
    if (status === "sent") fields.sentAt = now;
    if (status === "failed") fields.failedAt = now;
    if (error !== undefined) fields.error = error;
    await this.collection("messages").updateOne({ id }, { $set: fields });
  }

  async recordSyncLog(input: {
    workspaceId?: string | null;
    mailbox: string;
    folder: string;
    status: "success" | "failed";
    synced: number;
    error?: string;
  }) {
    const now = new Date();
    await this.collection("mail_sync_logs").insertOne({
      id: randomUUID(),
      workspace_id: input.workspaceId ?? null,
      workspaceId: input.workspaceId ?? null,
      mailbox: input.mailbox.toLowerCase(),
      folder: input.folder,
      status: input.status,
      synced: input.synced,
      error: input.error ?? null,
      created_at: now.toISOString(),
      createdAt: now,
    });
  }

  async listMessages(filter: MailListFilter) {
    const query: Record<string, unknown> = {
      mailbox: filter.mailbox.toLowerCase(),
      workspaceId: filter.workspaceId ?? null,
      deletedAt: { $exists: false },
    };
    if (filter.folder) query.folder = filter.folder;
    if (filter.unreadOnly) query.seen = false;
    if (filter.flaggedOnly) query.flagged = true;
    if (filter.attachmentsOnly) query.hasAttachments = true;
    if (filter.from?.trim()) query.from = { $regex: this.escapeRegex(filter.from.trim()), $options: "i" };
    if (filter.to?.trim()) query.to = { $regex: this.escapeRegex(filter.to.trim()), $options: "i" };
    if (filter.subject?.trim()) query.subject = { $regex: this.escapeRegex(filter.subject.trim()), $options: "i" };
    if (filter.since || filter.before) {
      query.date = {};
      if (filter.since) (query.date as Record<string, Date>).$gte = new Date(filter.since);
      if (filter.before) (query.date as Record<string, Date>).$lte = new Date(filter.before);
    }
    if (filter.search?.trim()) {
      const pattern = { $regex: this.escapeRegex(filter.search.trim()), $options: "i" };
      query.$or = [{ subject: pattern }, { from: pattern }, { text: pattern }, { html: pattern }];
    }

    const rows = await this.collection("messages")
      .find(query)
      .sort({ date: -1, createdAt: -1 })
      .limit(filter.limit ?? 40)
      .toArray();
    return rows.map((row) => this.toListMessage(row));
  }

  async getMessage(input: { workspaceId?: string | null; mailbox: string; id: string; includeAttachmentData?: boolean }) {
    const row = await this.findMessage(input);
    if (!row) {
      throw new NotFoundException("Message not found");
    }

    return {
      ...this.toDetailMessage(row),
      attachments: input.includeAttachmentData
        ? await this.attachmentsWithData(row)
        : this.arrayValue(row.attachments),
    };
  }

  async markSeen(input: { workspaceId?: string | null; mailbox: string; id: string; seen: boolean }) {
    await this.collection("messages").updateOne(
      this.messageFilter(input),
      { $set: { seen: input.seen, updatedAt: new Date() } },
    );
  }

  async setFlagged(input: { workspaceId?: string | null; mailbox: string; id: string; flagged: boolean }) {
    await this.collection("messages").updateOne(
      this.messageFilter(input),
      { $set: { flagged: input.flagged, updatedAt: new Date() } },
    );
  }

  async moveMessage(input: { workspaceId?: string | null; mailbox: string; id: string; folder: string }) {
    await this.collection("messages").updateOne(
      this.messageFilter(input),
      { $set: { folder: input.folder, updatedAt: new Date() } },
    );
  }

  async softDeleteMessage(input: { workspaceId?: string | null; mailbox: string; id: string }) {
    await this.collection("messages").updateOne(
      this.messageFilter(input),
      { $set: { deletedAt: new Date(), updatedAt: new Date() } },
    );
  }

  async findMessage(input: { workspaceId?: string | null; mailbox: string; id: string }) {
    return this.collection("messages").findOne(this.messageFilter(input));
  }

  async getAttachment(input: { workspaceId?: string | null; mailbox?: string; id: string }) {
    const filter: Record<string, unknown> = {
      id: input.id,
      workspaceId: input.workspaceId ?? null,
    };
    if (input.mailbox) filter.mailbox = input.mailbox.toLowerCase();
    const attachment = await this.collection("attachments").findOne(filter);
    if (!attachment) {
      throw new NotFoundException("Attachment not found");
    }
    const storagePath = this.stringValue(attachment.storagePath);
    if (!storagePath || !this.isInsideAttachmentRoot(storagePath)) {
      throw new NotFoundException("Attachment file not found");
    }
    return {
      filename: this.stringValue(attachment.filename) ?? "attachment",
      contentType: this.stringValue(attachment.contentType) ?? "application/octet-stream",
      bytes: await fs.readFile(storagePath),
    };
  }

  private async ensureIndexes() {
    await this.collection("messages")
      .dropIndex?.("workspaceId_1_mailbox_1_folder_1_uid")
      .catch(() => undefined);
    await this.collection("messages").createIndex(
      { workspaceId: 1, mailbox: 1, folder: 1, uid: 1 },
      {
        name: "workspaceId_1_mailbox_1_folder_1_uid",
        unique: true,
        partialFilterExpression: { uid: { $exists: true, $ne: null } },
      },
    );
    await this.collection("messages").createIndex({ workspaceId: 1, mailbox: 1, folder: 1, date: -1 });
    await this.collection("messages").createIndex({ messageId: 1, mailbox: 1 });
    await this.collection("conversations").createIndex({ workspaceId: 1, mailbox: 1, threadId: 1 }, { unique: true });
    await this.collection("attachments").createIndex({ id: 1 }, { unique: true });
    await this.collection("attachments").createIndex({ workspaceId: 1, mailbox: 1, messageId: 1 });
    await this.collection("mailboxes").createIndex({ workspaceId: 1, mailbox: 1 }, { unique: true });
    await this.collection("folders").createIndex({ workspaceId: 1, mailbox: 1, path: 1 }, { unique: true });
    await this.collection("mail_sync_logs").createIndex({ workspace_id: 1, mailbox: 1, created_at: -1 });
  }

  private collection(name: string) {
    if (!this.db) {
      throw new NotFoundException("Mongo mail archive is not configured");
    }
    return this.db.collection(name);
  }

  private async loadMongo() {
    this.mongoImport ??= (new Function("specifier", "return import(specifier)") as (
      specifier: string,
    ) => Promise<{ MongoClient: new (uri: string) => MongoClientLike }>)("mongodb");
    return this.mongoImport;
  }

  private async findExistingMessage(input: ArchiveMessageInput) {
    if (input.uid == null) return null;
    return this.collection("messages").findOne({
      workspaceId: input.workspaceId ?? null,
      mailbox: input.mailbox.toLowerCase(),
      folder: input.folder,
      uid: String(input.uid),
    });
  }

  private messageDocument(
    input: ArchiveMessageInput,
    id: string,
    attachments: ArchiveAttachment[],
    now: Date,
  ) {
    const text = input.text ?? "";
    const html = input.html ?? "";
    const subject = input.subject || "(No subject)";
    const threadId = this.threadKey(subject);
    const conversationId = this.conversationId(input.workspaceId ?? null, input.mailbox, threadId);
    const doc: Record<string, unknown> = {
      id,
      workspaceId: input.workspaceId ?? null,
      mailbox: input.mailbox.toLowerCase(),
      mailboxId: input.mailboxId ?? null,
      folder: input.folder,
      threadId,
      conversationId,
      messageId: input.messageId ?? null,
      inReplyTo: input.inReplyTo ?? null,
      references: input.references ?? [],
      from: input.from,
      to: input.to ?? [],
      cc: input.cc ?? [],
      bcc: input.bcc ?? [],
      subject,
      text,
      html,
      preview: this.preview(text || this.textFromHtml(html)),
      date: input.date ? new Date(input.date) : now,
      seen: input.seen ?? false,
      flagged: input.flagged ?? false,
      status: input.status ?? (input.direction === "inbound" ? "received" : "queued"),
      direction: input.direction,
      hasAttachments: attachments.length > 0,
      attachments: attachments.map((attachment) => ({
        id: attachment.id,
        filename: attachment.filename,
        originalFilename: attachment.originalFilename,
        contentType: attachment.contentType,
        sizeBytes: attachment.sizeBytes,
      })),
      rawPreview: input.rawPreview ?? "",
      error: input.error ?? null,
    };
    if (input.uid != null) {
      doc.uid = String(input.uid);
    }
    return doc;
  }

  private async storeAttachments(input: {
    workspaceId?: string | null;
    mailbox: string;
    messageId: string;
    attachments: ArchiveAttachmentInput[];
  }) {
    if (input.attachments.length === 0) return [];

    const workspaceSegment = this.safeSegment(input.workspaceId ?? "workspace-unknown");
    const mailboxSegment = this.safeSegment(input.mailbox.toLowerCase());
    const messageSegment = this.safeSegment(input.messageId);
    const targetDir = resolve(this.attachmentRoot, workspaceSegment, mailboxSegment, messageSegment);
    if (!this.isInsideAttachmentRoot(targetDir)) {
      throw new Error("Attachment path is outside the storage root");
    }
    await fs.mkdir(targetDir, { recursive: true });

    const stored: ArchiveAttachment[] = [];
    for (const attachment of input.attachments) {
      const originalFilename = attachment.filename || "attachment";
      const filename = this.safeFilename(originalFilename);
      const id = randomUUID();
      const bytes = this.decodeAttachment(attachment.dataBase64 ?? "");
      const storagePath = resolve(targetDir, `${Date.now()}-${id}-${filename}`);
      if (!this.isInsideAttachmentRoot(storagePath)) {
        throw new Error("Attachment file path is outside the storage root");
      }
      await fs.writeFile(storagePath, bytes);
      stored.push({
        id,
        filename,
        originalFilename,
        contentType: attachment.contentType || "application/octet-stream",
        sizeBytes: bytes.byteLength,
        storagePath,
      });
    }

    return stored;
  }

  private async persistAttachmentMetadata(
    workspaceId: string | null,
    mailbox: string,
    messageId: string,
    attachments: ArchiveAttachment[],
  ) {
    for (const attachment of attachments) {
      await this.collection("attachments").updateOne(
        { id: attachment.id },
        {
          $set: {
            ...attachment,
            workspaceId,
            mailbox: mailbox.toLowerCase(),
            messageId,
            updatedAt: new Date(),
          },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true },
      );
    }
  }

  private async persistConversation(input: ArchiveMessageInput, messageId: string, now: Date) {
    const subject = input.subject || "(No subject)";
    const threadId = this.threadKey(subject);
    await this.collection("conversations").updateOne(
      {
        workspaceId: input.workspaceId ?? null,
        mailbox: input.mailbox.toLowerCase(),
        threadId,
      },
      {
        $set: {
          workspaceId: input.workspaceId ?? null,
          mailbox: input.mailbox.toLowerCase(),
          threadId,
          subject,
          lastMessageId: messageId,
          lastMessageAt: input.date ? new Date(input.date) : now,
          updatedAt: now,
        },
        $setOnInsert: {
          id: this.conversationId(input.workspaceId ?? null, input.mailbox, threadId),
          createdAt: now,
        },
      },
      { upsert: true },
    );
  }

  private messageFilter(input: { workspaceId?: string | null; mailbox: string; id: string }) {
    return {
      id: input.id,
      workspaceId: input.workspaceId ?? null,
      mailbox: input.mailbox.toLowerCase(),
    };
  }

  private async attachmentsWithData(row: Record<string, unknown>) {
    const attachments = this.arrayValue(row.attachments);
    const withData = [];
    for (const attachment of attachments) {
      const metadata = await this.collection("attachments").findOne({
        id: this.stringValue(attachment.id),
      });
      const storagePath = this.stringValue(metadata?.storagePath);
      let dataBase64: string | undefined;
      if (storagePath && this.isInsideAttachmentRoot(storagePath)) {
        const stat = await fs.stat(storagePath).catch(() => null);
        if (stat && stat.size <= 8 * 1024 * 1024) {
          dataBase64 = (await fs.readFile(storagePath)).toString("base64");
        }
      }
      withData.push({ ...(attachment as Record<string, unknown>), dataBase64 });
    }
    return withData;
  }

  private toListMessage(row: Record<string, unknown>) {
    const subject = this.stringValue(row.subject) ?? "(No subject)";
    const threadKey = this.threadKey(subject);
    return {
      id: this.stringValue(row.id) ?? "",
      from: this.stringValue(row.from) ?? "",
      to: this.stringArray(row.to).join(", "),
      subject,
      date: this.dateString(row.date),
      seen: Boolean(row.seen),
      flagged: Boolean(row.flagged),
      preview: this.stringValue(row.preview) ?? "",
      hasAttachments: Boolean(row.hasAttachments),
      threadKey,
      threadSize: 1,
      status: this.stringValue(row.status),
      folder: this.stringValue(row.folder),
    };
  }

  private toDetailMessage(row: Record<string, unknown>) {
    return {
      ...this.toListMessage(row),
      cc: this.stringArray(row.cc).join(", "),
      text: this.stringValue(row.text) ?? "",
      html: this.stringValue(row.html) ?? "",
      attachments: this.arrayValue(row.attachments),
      rawPreview: this.stringValue(row.rawPreview) ?? "",
    };
  }

  private decodeAttachment(dataBase64: string) {
    const [, data] = dataBase64.includes(",") ? dataBase64.split(",", 2) : ["", dataBase64];
    return Buffer.from(data, "base64");
  }

  private safeFilename(filename: string) {
    const safe = basename(filename).replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180);
    return safe || "attachment";
  }

  private safeSegment(value: string) {
    return value.replace(/[^a-zA-Z0-9@._-]/g, "_").slice(0, 180) || "unknown";
  }

  private isInsideAttachmentRoot(path: string) {
    const root = `${this.attachmentRoot}${this.attachmentRoot.endsWith("/") ? "" : "/"}`;
    const target = `${resolve(path)}${path.endsWith("/") ? "/" : ""}`;
    return target.startsWith(root) || resolve(path) === this.attachmentRoot;
  }

  private arrayValue(value: unknown): Array<Record<string, unknown>> {
    return Array.isArray(value)
      ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
      : [];
  }

  private stringArray(value: unknown): string[] {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  }

  private stringValue(value: unknown) {
    return typeof value === "string" ? value : null;
  }

  private dateString(value: unknown) {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(String(value));
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  private preview(text: string) {
    return text.replace(/\s+/g, " ").trim().slice(0, 180);
  }

  private textFromHtml(html: string) {
    return html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  private threadKey(subject: string) {
    return subject
      .toLowerCase()
      .replace(/^\s*(re|fw|fwd):\s*/gi, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  private conversationId(workspaceId: string | null, mailbox: string, threadId: string) {
    return Buffer.from(`${workspaceId ?? "global"}:${mailbox.toLowerCase()}:${threadId}`).toString("base64url");
  }

  private escapeRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}
