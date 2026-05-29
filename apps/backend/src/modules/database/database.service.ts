import { Injectable, Logger, OnModuleDestroy, OnModuleInit, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "crypto";

type MongoCollection = {
  createIndex: (keys: Record<string, unknown>, options?: Record<string, unknown>) => Promise<unknown>;
  updateOne: (
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
    options?: Record<string, unknown>,
  ) => Promise<{ matchedCount?: number; modifiedCount?: number; upsertedCount?: number }>;
  insertOne: (doc: Record<string, unknown>) => Promise<unknown>;
  findOne: (filter: Record<string, unknown>, options?: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
  find: (filter: Record<string, unknown>, options?: Record<string, unknown>) => {
    sort: (sort: Record<string, 1 | -1>) => {
      limit: (limit: number) => { toArray: () => Promise<Array<Record<string, unknown>>> };
      toArray: () => Promise<Array<Record<string, unknown>>>;
    };
    limit: (limit: number) => { toArray: () => Promise<Array<Record<string, unknown>>> };
    toArray: () => Promise<Array<Record<string, unknown>>>;
  };
  countDocuments: (filter?: Record<string, unknown>) => Promise<number>;
  deleteOne: (filter: Record<string, unknown>) => Promise<{ deletedCount?: number }>;
  deleteMany: (filter: Record<string, unknown>) => Promise<{ deletedCount?: number }>;
};

type MongoDb = {
  collection: (name: string) => MongoCollection;
};

type MongoClientLike = {
  connect: () => Promise<void>;
  db: (name?: string) => MongoDb;
  close: () => Promise<void>;
};

export interface WorkspaceRow {
  id: string;
  name: string;
  status: string;
  created_at: string;
  updated_at?: string;
}

export interface UserRow {
  id: string;
  workspace_id?: string;
  workspace_name?: string;
  username: string | null;
  email: string;
  name: string | null;
  password_hash?: string;
  role: string;
  status: string;
  created_at: string;
  updated_at?: string;
}

export interface DomainRow {
  id: string;
  workspace_id?: string;
  domain: string;
  status?: string;
  created_at?: string;
  verified_at?: string | null;
  last_dns_check_at?: string | null;
}

export interface MailboxRow {
  id: string;
  workspace_id?: string;
  domain_id?: string | null;
  email: string;
  name?: string | null;
  quota_mb?: number;
  is_active?: boolean;
  created_at?: string;
}

export interface AliasRow {
  id: string;
  workspace_id?: string;
  domain_id?: string | null;
  address: string;
  goto: string;
  source_email?: string;
  destination_email?: string;
  is_active?: boolean;
  created_at?: string;
}

export interface DnsRecordInput {
  workspaceId?: string | null;
  domainId?: string | null;
  domain: string;
  status: string;
  checks: Record<string, boolean>;
  records: Array<Record<string, unknown>>;
  raw: Record<string, unknown>;
}

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private readonly uri?: string;
  private readonly dbName: string;
  private readonly mailboxCredentialKey?: string;
  private client?: MongoClientLike;
  private db?: MongoDb;
  private mongoImport?: Promise<{ MongoClient: new (uri: string) => MongoClientLike }>;

  constructor(private readonly config: ConfigService) {
    this.uri = config.get<string>("MONGODB_URI");
    this.dbName = config.get<string>("MONGODB_DB") || this.databaseNameFromUri(this.uri) || "yetrix_mail";
    this.mailboxCredentialKey = config.get<string>("MAILBOX_CREDENTIAL_ENCRYPTION_KEY");
  }

  get enabled() {
    return Boolean(this.db);
  }

  get connected() {
    return this.enabled;
  }

  async onModuleInit() {
    if (!this.uri) {
      this.logger.warn("MONGODB_URI is not configured; MongoDB app data is disabled");
      return;
    }

    try {
      const { MongoClient } = await this.loadMongo();
      this.client = new MongoClient(this.uri);
      await this.client.connect();
      this.db = this.client.db(this.dbName);
      await this.ensureIndexes();
      this.logger.log(`MongoDB app data connected to ${this.dbName}`);
    } catch (error) {
      this.logger.error(`MongoDB app data is disabled: ${this.errorMessage(error)}`);
      this.client = undefined;
      this.db = undefined;
    }
  }

  async onModuleDestroy() {
    await this.client?.close();
  }

  async createWorkspace(name: string, status = "pending") {
    const now = new Date().toISOString();
    const row: WorkspaceRow = { id: randomUUID(), name, status, created_at: now, updated_at: now };
    await this.collection("workspaces").insertOne({ ...row });
    return row;
  }

  async getWorkspace(id: string) {
    return this.row<WorkspaceRow>(await this.collection("workspaces").findOne({ id }));
  }

  async updateWorkspace(id: string, fields: Partial<Pick<WorkspaceRow, "name" | "status">>) {
    await this.collection("workspaces").updateOne(
      { id },
      { $set: { ...fields, updated_at: new Date().toISOString() } },
    );
    return this.getWorkspace(id);
  }

  async listWorkspaces() {
    const rows = await this.collection("workspaces").find({}).sort({ created_at: -1 }).toArray();
    return rows.map((row) => this.row<WorkspaceRow>(row)!);
  }

  async createUser(input: {
    workspaceId?: string;
    username: string;
    email: string;
    name: string;
    passwordHash: string;
    role: string;
    status?: string;
  }) {
    const now = new Date().toISOString();
    const row: UserRow = {
      id: randomUUID(),
      workspace_id: input.workspaceId,
      username: input.username || input.email.split("@")[0],
      email: input.email.toLowerCase(),
      name: input.name,
      password_hash: input.passwordHash,
      role: input.role,
      status: input.status ?? "active",
      created_at: now,
      updated_at: now,
    };
    await this.collection("users").insertOne({ ...row });
    return row;
  }

  async findUserByLogin(login: string) {
    const normalized = login.trim().toLowerCase();
    return this.row<UserRow>(
      await this.collection("users").findOne({
        $or: [{ email: normalized }, { username: normalized }],
      }),
    );
  }

  async findUserByEmail(email: string) {
    return this.row<UserRow>(await this.collection("users").findOne({ email: email.toLowerCase() }));
  }

  async findUserById(userId: string, workspaceId?: string | null) {
    const filter: Record<string, unknown> = { id: userId };
    if (workspaceId) filter.workspace_id = workspaceId;
    const user = this.row<UserRow>(await this.collection("users").findOne(filter));
    if (!user?.workspace_id) return user;
    const workspace = await this.getWorkspace(user.workspace_id);
    return { ...user, workspace_name: workspace?.name };
  }

  async listUsers(workspaceId?: string | null) {
    const filter: Record<string, unknown> = {};
    if (workspaceId) filter.workspace_id = workspaceId;
    const rows = await this.collection("users").find(filter).sort({ created_at: 1 }).toArray();
    const workspaces = await this.workspaceNameMap();
    return rows.map((row) => {
      const user = this.row<UserRow>(row)!;
      return { ...user, workspace_name: user.workspace_id ? workspaces.get(user.workspace_id) : undefined };
    });
  }

  async updateUser(userId: string, fields: {
    workspaceId?: string | null;
    name?: string;
    passwordHash?: string;
    role?: string;
    status?: string;
  }) {
    const filter: Record<string, unknown> = { id: userId };
    if (fields.workspaceId) filter.workspace_id = fields.workspaceId;
    const set: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (fields.name !== undefined) set.name = fields.name;
    if (fields.passwordHash !== undefined) set.password_hash = fields.passwordHash;
    if (fields.role !== undefined) set.role = fields.role;
    if (fields.status !== undefined) set.status = fields.status;
    await this.collection("users").updateOne(filter, { $set: set });
    return this.findUserById(userId, fields.workspaceId);
  }

  async deleteUser(userId: string, workspaceId?: string | null) {
    const filter: Record<string, unknown> = { id: userId };
    if (workspaceId) filter.workspace_id = workspaceId;
    await this.collection("users").deleteOne(filter);
  }

  async recordDomain(workspaceId: string, domain: string, status = "pending_dns") {
    const normalized = domain.toLowerCase();
    const existing = await this.findDomain(normalized);
    if (existing) return existing;
    const now = new Date().toISOString();
    const row: DomainRow = {
      id: randomUUID(),
      workspace_id: workspaceId,
      domain: normalized,
      status,
      created_at: now,
      last_dns_check_at: null,
      verified_at: null,
    };
    await this.collection("domains").insertOne({ ...row });
    return row;
  }

  async findDomain(domain: string) {
    return this.row<DomainRow>(await this.collection("domains").findOne({ domain: domain.toLowerCase() }));
  }

  async findWorkspaceDomain(workspaceId: string, domain: string) {
    return this.row<DomainRow>(
      await this.collection("domains").findOne({ workspace_id: workspaceId, domain: domain.toLowerCase() }),
    );
  }

  async listDomains(workspaceId?: string | null) {
    const filter: Record<string, unknown> = {};
    if (workspaceId) filter.workspace_id = workspaceId;
    const rows = await this.collection("domains").find(filter).sort({ created_at: -1 }).toArray();
    return rows.map((row) => this.row<DomainRow>(row)!);
  }

  async updateDomainStatus(domainId: string, status: string) {
    const now = new Date().toISOString();
    const set: Record<string, unknown> = {
      status,
      last_dns_check_at: now,
      updated_at: now,
    };
    if (status === "verified") set.verified_at = now;
    await this.collection("domains").updateOne({ id: domainId }, { $set: set });
  }

  async removeDomain(workspaceId: string | null, domain: string) {
    const filter: Record<string, unknown> = { domain: domain.toLowerCase() };
    if (workspaceId) filter.workspace_id = workspaceId;
    const domains = await this.collection("domains").find(filter).toArray();
    const domainIds = domains.map((row) => String(row.id));
    await this.collection("domains").deleteMany(filter);
    await this.collection("mailboxes").deleteMany({ domain_id: { $in: domainIds } });
    await this.collection("aliases").deleteMany({ domain_id: { $in: domainIds } });
  }

  async saveDnsRecord(input: DnsRecordInput) {
    const now = new Date().toISOString();
    const row = {
      id: randomUUID(),
      workspace_id: input.workspaceId ?? null,
      domain_id: input.domainId ?? null,
      domain: input.domain.toLowerCase(),
      status: input.status,
      checks: input.checks,
      records: input.records,
      raw: input.raw,
      created_at: now,
      updated_at: now,
    };
    await this.collection("dns_records").insertOne(row);
    return row;
  }

  async latestDnsRecord(domain: string, workspaceId?: string | null) {
    const filter: Record<string, unknown> = { domain: domain.toLowerCase() };
    if (workspaceId) filter.workspace_id = workspaceId;
    const rows = await this.collection("dns_records").find(filter).sort({ created_at: -1 }).limit(1).toArray();
    return this.row<Record<string, unknown>>(rows[0] ?? null);
  }

  async recordMailbox(input: {
    workspaceId: string;
    domainId?: string | null;
    email: string;
    name?: string | null;
    quotaMb?: number;
    active?: boolean;
  }) {
    const now = new Date().toISOString();
    const row: MailboxRow = {
      id: randomUUID(),
      workspace_id: input.workspaceId,
      domain_id: input.domainId ?? null,
      email: input.email.toLowerCase(),
      name: input.name ?? null,
      quota_mb: Math.max(input.quotaMb ?? 2048, 1024),
      is_active: input.active !== false,
      created_at: now,
    };
    await this.collection("mailboxes").updateOne(
      { email: row.email },
      { $set: { ...row, updated_at: now }, $setOnInsert: { id: row.id, created_at: now } },
      { upsert: true },
    );
    return this.findMailboxByEmail(row.email);
  }

  async findMailboxByEmail(email: string) {
    return this.row<MailboxRow>(await this.collection("mailboxes").findOne({ email: email.toLowerCase() }));
  }

  async updateMailbox(workspaceId: string | null, email: string, input: { name?: string; quotaMb?: number; active?: boolean }) {
    const filter: Record<string, unknown> = { email: email.toLowerCase() };
    if (workspaceId) filter.workspace_id = workspaceId;
    const set: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.name !== undefined) set.name = input.name;
    if (input.quotaMb !== undefined) set.quota_mb = Math.max(input.quotaMb, 1024);
    if (input.active !== undefined) set.is_active = input.active;
    await this.collection("mailboxes").updateOne(filter, { $set: set });
  }

  async saveMailboxCredential(email: string, password: string) {
    const encrypted = this.encryptMailboxCredential(password);
    await this.collection("mailboxes").updateOne(
      { email: email.toLowerCase() },
      { $set: { credential: encrypted, credential_updated_at: new Date().toISOString() } },
    );
  }

  async loadMailboxCredential(email: string) {
    const mailbox = await this.collection("mailboxes").findOne({ email: email.toLowerCase() });
    const credential = mailbox?.credential;
    if (!credential || typeof credential !== "object") return null;
    return this.decryptMailboxCredential(credential as Record<string, string>);
  }

  async removeMailbox(workspaceId: string | null, email: string) {
    const filter: Record<string, unknown> = { email: email.toLowerCase() };
    if (workspaceId) filter.workspace_id = workspaceId;
    await this.collection("mailboxes").deleteMany(filter);
  }

  async listMailboxes(workspaceId?: string | null) {
    const filter: Record<string, unknown> = {};
    if (workspaceId) filter.workspace_id = workspaceId;
    const rows = await this.collection("mailboxes").find(filter).toArray();
    return rows.map((row) => this.row<MailboxRow>(row)!);
  }

  async recordAlias(input: {
    workspaceId: string;
    domainId?: string | null;
    address: string;
    goto: string;
    active?: boolean;
  }) {
    const now = new Date().toISOString();
    const address = input.address.toLowerCase();
    const row: AliasRow = {
      id: randomUUID(),
      workspace_id: input.workspaceId,
      domain_id: input.domainId ?? null,
      address,
      goto: input.goto.toLowerCase(),
      source_email: address,
      destination_email: input.goto.toLowerCase(),
      is_active: input.active !== false,
      created_at: now,
    };
    await this.collection("aliases").updateOne(
      { workspace_id: input.workspaceId, address },
      { $set: { ...row, updated_at: now }, $setOnInsert: { id: row.id, created_at: now } },
      { upsert: true },
    );
    return this.findAlias(input.workspaceId, address);
  }

  async findAlias(workspaceId: string | null, idOrAddress: string) {
    const needle = idOrAddress.toLowerCase();
    const filter: Record<string, unknown> = { $or: [{ id: idOrAddress }, { address: needle }] };
    if (workspaceId) filter.workspace_id = workspaceId;
    return this.row<AliasRow>(await this.collection("aliases").findOne(filter));
  }

  async updateAlias(workspaceId: string | null, idOrAddress: string, input: { address?: string; goto?: string; active?: boolean }) {
    const current = await this.findAlias(workspaceId, idOrAddress);
    if (!current) return;
    const set: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.address) {
      set.address = input.address.toLowerCase();
      set.source_email = input.address.toLowerCase();
    }
    if (input.goto) {
      set.goto = input.goto.toLowerCase();
      set.destination_email = input.goto.toLowerCase();
    }
    if (input.active !== undefined) set.is_active = input.active;
    await this.collection("aliases").updateOne({ id: current.id }, { $set: set });
  }

  async removeAlias(workspaceId: string | null, idOrAddress: string) {
    const needle = idOrAddress.toLowerCase();
    const filter: Record<string, unknown> = { $or: [{ id: idOrAddress }, { address: needle }] };
    if (workspaceId) filter.workspace_id = workspaceId;
    await this.collection("aliases").deleteMany(filter);
  }

  async listAliases(workspaceId?: string | null) {
    const filter: Record<string, unknown> = {};
    if (workspaceId) filter.workspace_id = workspaceId;
    const rows = await this.collection("aliases").find(filter).toArray();
    return rows.map((row) => this.row<AliasRow>(row)!);
  }

  async recordAudit(input: { workspaceId?: string; actor: string; action: string; target: string }) {
    const now = new Date().toISOString();
    const row = {
      id: randomUUID(),
      workspace_id: input.workspaceId ?? null,
      actor: input.actor,
      action: input.action,
      target: input.target,
      created_at: now,
    };
    await this.collection("audit_logs").insertOne(row);
    return row;
  }

  async listAudit(workspaceId?: string | null, limit = 100) {
    const filter: Record<string, unknown> = {};
    if (workspaceId) filter.workspace_id = workspaceId;
    const rows = await this.collection("audit_logs").find(filter).sort({ created_at: -1 }).limit(limit).toArray();
    return rows.map((row) => this.row<Record<string, unknown>>(row)!);
  }

  async count(collectionName: string, workspaceId?: string | null) {
    const filter: Record<string, unknown> = {};
    if (workspaceId) filter.workspace_id = workspaceId;
    return this.collection(collectionName).countDocuments(filter);
  }

  async totalMailboxQuota(workspaceId?: string | null) {
    const rows = await this.listMailboxes(workspaceId);
    return rows.reduce((sum, mailbox) => sum + Number(mailbox.quota_mb ?? 0), 0);
  }

  async updateWorkspaceStatusFromDomains(workspaceId: string) {
    const verified = await this.collection("domains").countDocuments({ workspace_id: workspaceId, status: "verified" });
    await this.updateWorkspace(workspaceId, { status: verified > 0 ? "active" : "pending" });
  }

  async recordSentAttachment(input: {
    workspaceId?: string | null;
    mailbox: string;
    recipient: string;
    filename: string;
    contentType?: string;
    sizeBytes: number;
    storagePath: string;
    messageId: string;
  }) {
    await this.collection("attachments").insertOne({
      id: randomUUID(),
      workspace_id: input.workspaceId ?? null,
      mailbox_id: null,
      mailbox: input.mailbox.toLowerCase(),
      recipient: input.recipient.toLowerCase(),
      filename: input.filename,
      mimeType: input.contentType ?? "application/octet-stream",
      content_type: input.contentType ?? "application/octet-stream",
      size: input.sizeBytes,
      size_bytes: input.sizeBytes,
      localPath: input.storagePath,
      storage_path: input.storagePath,
      messageId: input.messageId,
      message_id: input.messageId,
      created_at: new Date().toISOString(),
    });
  }

  private async ensureIndexes() {
    await this.collection("users").createIndex({ email: 1 }, { unique: true });
    await this.collection("users").createIndex({ username: 1 });
    await this.collection("users").createIndex({ workspace_id: 1 });
    await this.collection("workspaces").createIndex({ id: 1 }, { unique: true });
    await this.collection("domains").createIndex({ domain: 1 }, { unique: true });
    await this.collection("domains").createIndex({ workspace_id: 1 });
    await this.collection("mailboxes").createIndex({ email: 1 }, { unique: true });
    await this.collection("mailboxes").createIndex({ workspace_id: 1 });
    await this.collection("aliases").createIndex({ workspace_id: 1, address: 1 }, { unique: true });
    await this.collection("dns_records").createIndex({ domain: 1, created_at: -1 });
    await this.collection("folders").createIndex({ workspaceId: 1, mailbox: 1, path: 1 }, { unique: true });
    await this.collection("messages").createIndex({ workspaceId: 1, mailbox: 1, folder: 1, uid: 1 }, { unique: true, sparse: true });
    await this.collection("attachments").createIndex({ id: 1 }, { unique: true });
    await this.collection("sessions").createIndex({ expires_at: 1 });
    await this.collection("audit_logs").createIndex({ workspace_id: 1, created_at: -1 });
    await this.collection("app_settings").createIndex({ key: 1 }, { unique: true });
    await this.collection("mail_sync_logs").createIndex({ workspace_id: 1, mailbox: 1, created_at: -1 });
  }

  private collection(name: string) {
    if (!this.db) {
      throw new ServiceUnavailableException("MONGODB_URI must be configured for this action");
    }
    return this.db.collection(name);
  }

  private async workspaceNameMap() {
    const rows = await this.collection("workspaces").find({}).toArray();
    return new Map(rows.map((row) => [String(row.id), String(row.name ?? "Workspace")]));
  }

  private row<T>(value: Record<string, unknown> | null) {
    if (!value) return null;
    const { _id, ...rest } = value;
    void _id;
    return rest as T;
  }

  private async loadMongo() {
    this.mongoImport ??= (new Function("specifier", "return import(specifier)") as (
      specifier: string,
    ) => Promise<{ MongoClient: new (uri: string) => MongoClientLike }>)("mongodb");
    return this.mongoImport;
  }

  private databaseNameFromUri(uri?: string) {
    if (!uri) return null;
    try {
      const parsed = new URL(uri.replace(/^mongodb\+srv:\/\//, "https://").replace(/^mongodb:\/\//, "https://"));
      const name = parsed.pathname.replace(/^\//, "");
      return name || null;
    } catch {
      return null;
    }
  }

  private errorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }

  private encryptMailboxCredential(value: string) {
    const key = this.credentialKey();
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
    return {
      algorithm: "aes-256-gcm",
      iv: iv.toString("base64url"),
      tag: cipher.getAuthTag().toString("base64url"),
      ciphertext: encrypted.toString("base64url"),
    };
  }

  private decryptMailboxCredential(value: Record<string, string>) {
    const key = this.credentialKey();
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(value.iv, "base64url"));
    decipher.setAuthTag(Buffer.from(value.tag, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(value.ciphertext, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  }

  private credentialKey() {
    if (!this.mailboxCredentialKey) {
      throw new ServiceUnavailableException("MAILBOX_CREDENTIAL_ENCRYPTION_KEY must be configured");
    }
    return createHash("sha256").update(this.mailboxCredentialKey).digest();
  }
}
