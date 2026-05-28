import { Injectable, Logger, OnModuleDestroy, OnModuleInit, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Pool, QueryResultRow } from "pg";

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private readonly pool?: Pool;

  constructor(private readonly config: ConfigService) {
    const connectionString = this.config.get<string>("DATABASE_URL");
    if (connectionString) {
      this.pool = new Pool({ connectionString });
    }
  }

  get enabled() {
    return Boolean(this.pool);
  }

  async onModuleInit() {
    if (!this.pool) {
      this.logger.warn("DATABASE_URL is not configured; multi-tenant storage is disabled");
      return;
    }

    await this.withRetry(() => this.migrate());
  }

  async onModuleDestroy() {
    await this.pool?.end();
  }

  async query<T extends QueryResultRow = QueryResultRow>(sql: string, params: unknown[] = []) {
    if (!this.pool) {
      throw new ServiceUnavailableException("DATABASE_URL must be configured for this action");
    }

    return this.pool.query<T>(sql, params);
  }

  private async migrate() {
    await this.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
    await this.query(`
      CREATE TABLE IF NOT EXISTS workspaces (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await this.query(`ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`);
    await this.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        username TEXT,
        email TEXT NOT NULL UNIQUE,
        name TEXT,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'admin',
        status TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await this.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT`);
    await this.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT`);
    await this.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'`);
    await this.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`);
    await this.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_workspace_username
      ON users(workspace_id, lower(username))
      WHERE username IS NOT NULL
    `);
    await this.query(`
      CREATE TABLE IF NOT EXISTS domains (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        domain TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL DEFAULT 'pending_dns',
        dkim_selector TEXT NOT NULL DEFAULT 'dkim',
        dkim_public_key TEXT,
        verified_at TIMESTAMPTZ,
        last_dns_check_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await this.query(`ALTER TABLE domains ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ`);
    await this.query(`ALTER TABLE domains ADD COLUMN IF NOT EXISTS last_dns_check_at TIMESTAMPTZ`);
    await this.query(`ALTER TABLE domains ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`);
    await this.query(`
      CREATE TABLE IF NOT EXISTS mailboxes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        domain_id UUID REFERENCES domains(id) ON DELETE CASCADE,
        email TEXT NOT NULL UNIQUE,
        name TEXT,
        quota_mb INTEGER NOT NULL DEFAULT 2048,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await this.query(`ALTER TABLE mailboxes ADD COLUMN IF NOT EXISTS name TEXT`);
    await this.query(`ALTER TABLE mailboxes ADD COLUMN IF NOT EXISTS password_hash TEXT`);
    await this.query(`ALTER TABLE mailboxes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`);
    await this.query(`ALTER TABLE mailboxes ALTER COLUMN password_hash DROP NOT NULL`);
    await this.query(`
      CREATE TABLE IF NOT EXISTS aliases (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
        domain_id UUID REFERENCES domains(id) ON DELETE CASCADE,
        source_email TEXT,
        destination_email TEXT,
        address TEXT,
        goto TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await this.query(`ALTER TABLE aliases ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE`);
    await this.query(`ALTER TABLE aliases ADD COLUMN IF NOT EXISTS address TEXT`);
    await this.query(`ALTER TABLE aliases ADD COLUMN IF NOT EXISTS goto TEXT`);
    await this.query(`ALTER TABLE aliases ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true`);
    await this.query(`ALTER TABLE aliases ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`);
    await this.query(`
      CREATE TABLE IF NOT EXISTS audit_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
        actor TEXT NOT NULL,
        action TEXT NOT NULL,
        target TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await this.query(`
      CREATE TABLE IF NOT EXISTS dns_checks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
        domain_id UUID REFERENCES domains(id) ON DELETE CASCADE,
        domain TEXT NOT NULL,
        status TEXT NOT NULL,
        checks JSONB NOT NULL DEFAULT '{}'::jsonb,
        records JSONB NOT NULL DEFAULT '[]'::jsonb,
        raw JSONB NOT NULL DEFAULT '{}'::jsonb,
        checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await this.query(`
      CREATE TABLE IF NOT EXISTS sent_attachments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
        mailbox TEXT NOT NULL,
        recipient TEXT NOT NULL,
        filename TEXT NOT NULL,
        content_type TEXT,
        size_bytes INTEGER NOT NULL DEFAULT 0,
        storage_path TEXT NOT NULL,
        message_id TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await this.query(`CREATE INDEX IF NOT EXISTS idx_domains_workspace_id ON domains(workspace_id)`);
    await this.query(`CREATE INDEX IF NOT EXISTS idx_mailboxes_workspace_id ON mailboxes(workspace_id)`);
    await this.query(`CREATE INDEX IF NOT EXISTS idx_aliases_workspace_id ON aliases(workspace_id)`);
    await this.query(`CREATE INDEX IF NOT EXISTS idx_audit_workspace_id ON audit_events(workspace_id)`);
    await this.query(`CREATE INDEX IF NOT EXISTS idx_dns_checks_domain ON dns_checks(lower(domain))`);
    await this.query(`CREATE INDEX IF NOT EXISTS idx_sent_attachments_mailbox ON sent_attachments(lower(mailbox))`);
  }

  private async withRetry(task: () => Promise<void>) {
    let lastError: unknown;
    for (let attempt = 1; attempt <= 10; attempt += 1) {
      try {
        await task();
        return;
      } catch (error) {
        lastError = error;
        this.logger.warn(`Database migration attempt ${attempt} failed; retrying shortly`);
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }

    throw lastError;
  }
}
