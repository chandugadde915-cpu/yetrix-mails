import {
  BadGatewayException,
  BadRequestException,
  HttpException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import { ImapFlow } from "imapflow";
import nodemailer from "nodemailer";
import { basename, join } from "path";
import { DatabaseService } from "../database/database.service";

interface SendAttachment {
  filename: string;
  contentType?: string;
  dataBase64: string;
}

interface StoredAttachment {
  filename: string;
  contentType?: string;
  sizeBytes: number;
  storagePath: string;
}

export interface MessageAttachment {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  dataBase64?: string;
}

interface ParsedMessageBody {
  text: string;
  html: string;
  attachments: MessageAttachment[];
}

export interface MailContact {
  email: string;
  name?: string;
  source: "sender" | "recipient";
}

@Injectable()
export class MailWorkspaceService {
  private readonly host: string;
  private readonly storageDir: string;

  constructor(
    config: ConfigService,
    private readonly database: DatabaseService,
  ) {
    this.host = config.get<string>("MAIL_CLIENT_HOST", "mail.yetrixtechnologies.com");
    this.storageDir = config.get<string>("LOCAL_MAIL_STORAGE_DIR", join(process.cwd(), "storage", "sent-attachments"));
  }

  async testConnection(input: { email: string; password: string }) {
    await this.withImap(input, async (client) => {
      await client.noop();
    });

    const transport = this.smtpTransport(input);
    try {
      await transport.verify();
    } catch (error) {
      throw this.mailServerException(error, "verify SMTP login");
    }

    return {
      imap: true,
      smtp: true,
      host: this.host,
    };
  }

  async listFolders(input: { email: string; password: string }) {
    return this.withImap(input, async (client) => {
      const folders = await client.list();
      return folders.map((folder) => ({
        path: folder.path,
        name: folder.name,
        listed: folder.listed,
        subscribed: folder.subscribed,
        specialUse: folder.specialUse ?? null,
      }));
    });
  }

  async listMessages(input: {
    email: string;
    password: string;
    limit?: number;
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
  }) {
    const limit = input.limit ?? 20;
    return this.withMailbox(input, input.folder ?? "INBOX", async (client) => {
      const exists = client.mailbox ? client.mailbox.exists : 0;
      if (exists === 0) {
        return [];
      }

      const criteria = this.buildSearchCriteria(input);
      const matched = criteria
        ? await client.search(criteria, { uid: true })
        : null;
      const fetchLimit = input.attachmentsOnly && !criteria ? Math.max(limit, 100) : limit;
      const uidList = Array.isArray(matched) ? matched.slice(-fetchLimit) : null;
      const range =
        uidList && uidList.length > 0
          ? uidList
          : `${Math.max(1, exists - fetchLimit + 1)}:*`;
      if (uidList && uidList.length === 0) {
        return [];
      }

      const messages = [];
      for await (const message of client.fetch(
        range,
        {
          envelope: true,
          flags: true,
          internalDate: true,
          source: { maxLength: 12000 },
          uid: true,
        },
        uidList ? { uid: true } : undefined,
      )) {
        const parsed = this.parseMessageSource(message.source, false);
        messages.push({
          id: String(message.uid),
          from: message.envelope?.from?.map((item) => item.address).join(", ") ?? "",
          to: message.envelope?.to?.map((item) => item.address).join(", ") ?? "",
          subject: message.envelope?.subject ?? "(No subject)",
          date: message.internalDate ? new Date(message.internalDate).toISOString() : null,
          seen: message.flags?.has("\\Seen") ?? false,
          flagged: message.flags?.has("\\Flagged") ?? false,
          preview: this.preview(parsed.text || this.textFromHtml(parsed.html)),
          hasAttachments: parsed.attachments.length > 0,
          threadKey: this.threadKey(message.envelope?.subject ?? "(No subject)"),
        });
      }

      const filteredMessages = input.attachmentsOnly
        ? messages.filter((message) => message.hasAttachments)
        : messages;
      const threadCounts = filteredMessages.reduce<Record<string, number>>((counts, message) => {
        counts[message.threadKey] = (counts[message.threadKey] ?? 0) + 1;
        return counts;
      }, {});

      return filteredMessages
        .slice(-limit)
        .map((message) => ({
          ...message,
          threadSize: threadCounts[message.threadKey] ?? 1,
        }))
        .reverse();
    });
  }

  async getMessage(input: { email: string; password: string; id: string; folder?: string }) {
    return this.withMailbox(input, input.folder ?? "INBOX", async (client) => {
      const message = await client.fetchOne(
        input.id,
        {
          envelope: true,
          flags: true,
          internalDate: true,
          source: { maxLength: 12 * 1024 * 1024 },
          uid: true,
        },
        { uid: true },
      );

      if (!message) {
        throw new NotFoundException("Message not found");
      }

      await client.messageFlagsAdd(input.id, ["\\Seen"], { uid: true });
      const parsed = this.parseMessageSource(message.source, true);

      return {
        id: String(message.uid),
        from: message.envelope?.from?.map((item) => item.address).join(", ") ?? "",
        to: message.envelope?.to?.map((item) => item.address).join(", ") ?? "",
        cc: message.envelope?.cc?.map((item) => item.address).join(", ") ?? "",
        subject: message.envelope?.subject ?? "(No subject)",
        date: message.internalDate ? new Date(message.internalDate).toISOString() : null,
        seen: true,
        flagged: message.flags?.has("\\Flagged") ?? false,
        threadKey: this.threadKey(message.envelope?.subject ?? "(No subject)"),
        text: parsed.text,
        html: parsed.html,
        attachments: parsed.attachments,
        rawPreview: message.source?.toString("utf8", 0, 6000) ?? "",
      };
    });
  }

  async deleteMessage(input: { email: string; password: string; id: string; folder?: string }) {
    return this.withMailbox(input, input.folder ?? "INBOX", async (client) => {
      await client.messageDelete(input.id, { uid: true });
      return {
        id: input.id,
        deleted: true,
      };
    });
  }

  async archiveMessage(input: { email: string; password: string; id: string; folder?: string }) {
    return this.moveMessage(input, "\\Archive", "Archive");
  }

  async trashMessage(input: { email: string; password: string; id: string; folder?: string }) {
    return this.moveMessage(input, "\\Trash", "Trash");
  }

  async setFlagged(input: { email: string; password: string; id: string; folder?: string }, flagged: boolean) {
    return this.withMailbox(input, input.folder ?? "INBOX", async (client) => {
      if (flagged) {
        await client.messageFlagsAdd(input.id, ["\\Flagged"], { uid: true });
      } else {
        await client.messageFlagsRemove(input.id, ["\\Flagged"], { uid: true });
      }
      return {
        id: input.id,
        flagged,
      };
    });
  }

  async listContacts(input: { email: string; password: string; folder?: string }) {
    const contacts = new Map<string, MailContact>();
    await this.withMailbox(input, input.folder ?? "INBOX", async (client) => {
      const exists = client.mailbox ? client.mailbox.exists : 0;
      if (exists === 0) {
        return;
      }

      const range = `${Math.max(1, exists - 99)}:*`;
      for await (const message of client.fetch(range, { envelope: true })) {
        for (const item of message.envelope?.from ?? []) {
          this.addContact(contacts, item.address, item.name, "sender");
        }
        for (const item of [...(message.envelope?.to ?? []), ...(message.envelope?.cc ?? [])]) {
          this.addContact(contacts, item.address, item.name, "recipient");
        }
      }
    });

    return Array.from(contacts.values()).sort((a, b) => a.email.localeCompare(b.email));
  }

  async sendMessage(input: {
    from: string;
    password: string;
    to: string;
    subject: string;
    text: string;
    html?: string;
    cc?: string;
    attachments?: SendAttachment[];
  }, workspaceId?: string) {
    const transport = this.smtpTransport({ email: input.from, password: input.password });
    const storedAttachments = await this.storeAttachments(input.attachments ?? []);

    let result;
    try {
      result = await transport.sendMail({
        from: input.from,
        to: input.to,
        cc: input.cc,
        subject: input.subject,
        text: input.text,
        html: input.html,
        attachments: storedAttachments.map((attachment) => ({
          filename: attachment.filename,
          contentType: attachment.contentType,
          path: attachment.storagePath,
        })),
      });
    } catch (error) {
      throw this.mailServerException(error, "send mail through SMTP");
    }
    await this.saveSentCopy(input, storedAttachments).catch(() => undefined);
    await this.recordSentAttachments(workspaceId, input, String(result.messageId ?? ""), storedAttachments);

    return {
      messageId: result.messageId,
      accepted: result.accepted,
      rejected: result.rejected,
      attachments: storedAttachments.map((attachment) => ({
        filename: attachment.filename,
        sizeBytes: attachment.sizeBytes,
        stored: true,
      })),
    };
  }

  private async saveSentCopy(input: {
    from: string;
    password: string;
    to: string;
    subject: string;
    text: string;
    html?: string;
    cc?: string;
    attachments?: SendAttachment[];
  }, attachments: StoredAttachment[]) {
    await this.withImap({ email: input.from, password: input.password }, async (client) => {
      const folders = await client.list();
      const sentFolder =
        folders.find((folder) => folder.specialUse === "\\Sent")?.path ??
        folders.find((folder) => /sent/i.test(folder.name))?.path ??
        "Sent";
      if (!folders.some((folder) => folder.path === sentFolder)) {
        await client.mailboxCreate(sentFolder).catch(() => undefined);
      }

      const raw = await this.buildRawMessage(input, attachments);
      await client.append(sentFolder, raw, ["\\Seen"], new Date());
    });
  }

  private async moveMessage(
    input: { email: string; password: string; id: string; folder?: string },
    specialUse: string,
    fallbackFolder: string,
  ) {
    return this.withMailbox(input, input.folder ?? "INBOX", async (client) => {
      const folders = await client.list();
      const destination =
        folders.find((folder) => folder.specialUse === specialUse)?.path ??
        folders.find((folder) => folder.name.toLowerCase() === fallbackFolder.toLowerCase())?.path ??
        fallbackFolder;

      if (!folders.some((folder) => folder.path === destination)) {
        await client.mailboxCreate(destination).catch(() => undefined);
      }

      await client.messageMove(input.id, destination, { uid: true });
      return {
        id: input.id,
        folder: destination,
        moved: true,
      };
    });
  }

  private async buildRawMessage(
    input: {
      from: string;
      to: string;
      subject: string;
      text: string;
      html?: string;
      cc?: string;
    },
    attachments: StoredAttachment[],
  ) {
    const builder = nodemailer.createTransport({
      buffer: true,
      newline: "windows",
      streamTransport: true,
    });
    const result = await builder.sendMail({
      from: input.from,
      to: input.to,
      cc: input.cc,
      subject: input.subject,
      text: input.text,
      html: input.html,
      attachments: attachments.map((attachment) => ({
        filename: attachment.filename,
        contentType: attachment.contentType,
        path: attachment.storagePath,
      })),
    });
    return result.message as Buffer;
  }

  private async storeAttachments(attachments: SendAttachment[]): Promise<StoredAttachment[]> {
    if (attachments.length === 0) {
      return [];
    }

    const dayFolder = new Date().toISOString().slice(0, 10);
    const targetDir = join(this.storageDir, dayFolder);
    await fs.mkdir(targetDir, { recursive: true });

    const stored: StoredAttachment[] = [];
    for (const attachment of attachments) {
      const filename = this.safeFilename(attachment.filename);
      const buffer = this.decodeAttachment(attachment.dataBase64);
      if (buffer.byteLength > 10 * 1024 * 1024) {
        throw new BadRequestException(`${filename} is larger than the 10 MB attachment limit`);
      }

      const storagePath = join(targetDir, `${Date.now()}-${randomUUID()}-${filename}`);
      await fs.writeFile(storagePath, buffer);
      stored.push({
        filename,
        contentType: attachment.contentType,
        sizeBytes: buffer.byteLength,
        storagePath,
      });
    }

    return stored;
  }

  private decodeAttachment(dataBase64: string) {
    const [, data] = dataBase64.includes(",") ? dataBase64.split(",", 2) : ["", dataBase64];
    try {
      return Buffer.from(data, "base64");
    } catch {
      throw new BadRequestException("Attachment data must be base64 encoded");
    }
  }

  private safeFilename(filename: string) {
    const safe = basename(filename).replace(/[^a-zA-Z0-9._-]/g, "_");
    if (!safe) {
      throw new BadRequestException("Attachment filename is required");
    }
    return safe.slice(0, 180);
  }

  private async recordSentAttachments(
    workspaceId: string | undefined,
    input: { from: string; to: string },
    messageId: string,
    attachments: StoredAttachment[],
  ) {
    if (!this.database.enabled || attachments.length === 0) {
      return;
    }

    for (const attachment of attachments) {
      await this.database.query(
        `
          INSERT INTO sent_attachments(
            workspace_id, mailbox, recipient, filename, content_type, size_bytes, storage_path, message_id
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
        [
          workspaceId ?? null,
          input.from.toLowerCase(),
          input.to.toLowerCase(),
          attachment.filename,
          attachment.contentType ?? null,
          attachment.sizeBytes,
          attachment.storagePath,
          messageId,
        ],
      );
    }
  }

  private async withMailbox<T>(
    input: { email: string; password: string },
    folder: string,
    task: (client: ImapFlow) => Promise<T>,
  ) {
    return this.withImap(input, async (client) => {
      const lock = await client.getMailboxLock(folder);
      try {
        return await task(client);
      } finally {
        lock.release();
      }
    });
  }

  private async withImap<T>(
    input: { email: string; password: string },
    task: (client: ImapFlow) => Promise<T>,
  ) {
    const client = new ImapFlow({
      host: this.host,
      port: 993,
      secure: true,
      auth: {
        user: input.email,
        pass: input.password,
      },
      logger: false,
    });

    try {
      await client.connect();
    } catch (error) {
      throw this.mailServerException(error, "connect to IMAP");
    }
    try {
      return await task(client);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw this.mailServerException(error, "complete the mailbox operation");
    } finally {
      await client.logout().catch(() => undefined);
    }
  }

  private smtpTransport(input: { email: string; password: string }) {
    return nodemailer.createTransport({
      host: this.host,
      port: 587,
      secure: false,
      auth: {
        user: input.email,
        pass: input.password,
      },
      requireTLS: true,
    });
  }

  private buildSearchCriteria(input: {
    search?: string;
    from?: string;
    to?: string;
    subject?: string;
    since?: string;
    before?: string;
    unreadOnly?: boolean;
    flaggedOnly?: boolean;
  }) {
    const criteria: Record<string, unknown> = {};
    const search = input.search?.trim();
    if (search) {
      criteria.or = [{ subject: search }, { from: search }, { text: search }];
    }
    if (input.from?.trim()) criteria.from = input.from.trim();
    if (input.to?.trim()) criteria.to = input.to.trim();
    if (input.subject?.trim()) criteria.subject = input.subject.trim();
    if (input.since?.trim()) criteria.since = input.since.trim();
    if (input.before?.trim()) criteria.before = input.before.trim();
    if (input.unreadOnly) criteria.seen = false;
    if (input.flaggedOnly) criteria.flagged = true;

    return Object.keys(criteria).length > 0 ? criteria : null;
  }

  private parseMessageSource(source?: Buffer, includeAttachmentData = false): ParsedMessageBody {
    if (!source) {
      return { text: "", html: "", attachments: [] };
    }

    const parsed: ParsedMessageBody = { text: "", html: "", attachments: [] };
    this.walkMimePart(source.toString("utf8"), parsed, includeAttachmentData);
    return {
      ...parsed,
      html: this.sanitizeHtml(parsed.html),
      text: parsed.text.trim(),
    };
  }

  private walkMimePart(raw: string, parsed: ParsedMessageBody, includeAttachmentData: boolean) {
    const splitAt = raw.search(/\r?\n\r?\n/);
    const headerText = splitAt >= 0 ? raw.slice(0, splitAt) : "";
    const body = splitAt >= 0 ? raw.slice(splitAt).replace(/^\r?\n\r?\n/, "") : raw;
    const headers = this.parseHeaders(headerText);
    const contentType = headers["content-type"] ?? "text/plain";
    const disposition = headers["content-disposition"] ?? "";
    const transferEncoding = (headers["content-transfer-encoding"] ?? "").toLowerCase();
    const boundary = this.headerParam(contentType, "boundary");

    if (boundary) {
      for (const part of this.splitMimeParts(body, boundary)) {
        this.walkMimePart(part, parsed, includeAttachmentData);
      }
      return;
    }

    const filename =
      this.headerParam(disposition, "filename") ??
      this.headerParam(contentType, "name") ??
      "";
    const isAttachment = /attachment/i.test(disposition) || Boolean(filename);
    const decoded = this.decodeMimeBody(body, transferEncoding);
    const lowerType = contentType.toLowerCase();

    if (isAttachment) {
      const safeName = this.safeFilename(filename || "attachment");
      parsed.attachments.push({
        id: `${parsed.attachments.length}-${safeName}`,
        filename: safeName,
        contentType: lowerType.split(";")[0] || "application/octet-stream",
        sizeBytes: decoded.byteLength,
        dataBase64:
          includeAttachmentData && decoded.byteLength <= 8 * 1024 * 1024
            ? decoded.toString("base64")
            : undefined,
      });
      return;
    }

    const decodedText = decoded.toString("utf8").trim();
    if (lowerType.includes("text/html")) {
      parsed.html = parsed.html || decodedText;
      return;
    }

    if (lowerType.includes("text/plain")) {
      parsed.text = parsed.text || decodedText;
    }
  }

  private parseHeaders(headerText: string) {
    const headers: Record<string, string> = {};
    const lines = headerText.replace(/\r/g, "").split("\n");
    let active = "";

    for (const line of lines) {
      if (/^\s/.test(line) && active) {
        headers[active] = `${headers[active]} ${line.trim()}`;
        continue;
      }

      const index = line.indexOf(":");
      if (index === -1) {
        continue;
      }

      active = line.slice(0, index).trim().toLowerCase();
      headers[active] = line.slice(index + 1).trim();
    }

    return headers;
  }

  private headerParam(value: string, param: string) {
    const pattern = new RegExp(`${param}\\*?=(?:"([^"]+)"|([^;]+))`, "i");
    const match = value.match(pattern);
    if (!match) {
      return null;
    }

    const raw = (match[1] ?? match[2] ?? "").trim();
    try {
      return decodeURIComponent(raw.replace(/^utf-8''/i, ""));
    } catch {
      return raw;
    }
  }

  private splitMimeParts(body: string, boundary: string) {
    return body
      .split(`--${boundary}`)
      .map((part) => part.trim())
      .filter((part) => part && part !== "--" && !part.startsWith("--"));
  }

  private decodeMimeBody(body: string, transferEncoding: string) {
    const cleanBody = body.replace(/\r?\n--$/g, "").trim();
    if (transferEncoding === "base64") {
      return Buffer.from(cleanBody.replace(/\s/g, ""), "base64");
    }

    if (transferEncoding === "quoted-printable") {
      return Buffer.from(this.decodeQuotedPrintable(cleanBody), "utf8");
    }

    return Buffer.from(cleanBody, "utf8");
  }

  private decodeQuotedPrintable(value: string) {
    return value
      .replace(/=\r?\n/g, "")
      .replace(/=([a-fA-F0-9]{2})/g, (_, hex: string) =>
        String.fromCharCode(Number.parseInt(hex, 16)),
      );
  }

  private sanitizeHtml(html: string) {
    if (!html) {
      return "";
    }

    return html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
      .replace(/\s+on[a-z]+\s*=\s*"[^"]*"/gi, "")
      .replace(/\s+on[a-z]+\s*=\s*'[^']*'/gi, "")
      .replace(/\s+on[a-z]+\s*=\s*[^\s>]+/gi, "")
      .replace(/javascript:/gi, "");
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

  private mailServerException(error: unknown, action: string) {
    const message = error instanceof Error ? error.message : String(error);
    const lower = message.toLowerCase();

    if (
      lower.includes("authentication") ||
      lower.includes("auth failed") ||
      lower.includes("invalid login") ||
      lower.includes("invalid credentials") ||
      lower.includes("535")
    ) {
      return new UnauthorizedException("Mailbox email or password is incorrect");
    }

    if (
      lower.includes("enotfound") ||
      lower.includes("econnrefused") ||
      lower.includes("etimedout") ||
      lower.includes("certificate") ||
      lower.includes("tls") ||
      lower.includes("ssl")
    ) {
      return new BadGatewayException(
        `Could not ${action}. Check MAIL_CLIENT_HOST, mail server DNS, ports 993/587, and TLS. ${message}`,
      );
    }

    return new BadGatewayException(`Mail server could not ${action}: ${message}`);
  }

  private addContact(
    contacts: Map<string, MailContact>,
    email: string | undefined,
    name: string | undefined,
    source: "sender" | "recipient",
  ) {
    const normalized = email?.trim().toLowerCase();
    if (!normalized || normalized === "undefined") {
      return;
    }

    if (!contacts.has(normalized)) {
      contacts.set(normalized, { email: normalized, name: name || undefined, source });
    }
  }

  private preview(text: string) {
    return text.replace(/\s+/g, " ").trim().slice(0, 180);
  }
}
