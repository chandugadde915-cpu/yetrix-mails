import { BadRequestException, ConflictException, ForbiddenException, Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";

interface DomainRow {
  id: string;
  domain: string;
}

@Injectable()
export class TenancyService {
  constructor(private readonly database: DatabaseService) {}

  get enabled() {
    return this.database.enabled;
  }

  requireWorkspace(workspaceId?: string) {
    if (!this.database.enabled) return null;
    if (!workspaceId) {
      throw new ForbiddenException("Workspace setup required");
    }
    return workspaceId;
  }

  optionalWorkspace(workspaceId?: string) {
    if (!this.database.enabled) return null;
    return workspaceId ?? null;
  }

  async listDomainNames(workspaceId?: string) {
    const id = this.optionalWorkspace(workspaceId);
    if (!id) return this.database.enabled ? [] : null;

    const result = await this.database.query<{ domain: string }>(
      "SELECT domain FROM domains WHERE workspace_id = $1 ORDER BY created_at DESC",
      [id],
    );
    return result.rows.map((row) => row.domain);
  }

  async ensureDomainAccess(workspaceId: string | undefined, domain: string) {
    const id = this.requireWorkspace(workspaceId);
    if (!id) return null;

    const result = await this.database.query<DomainRow>(
      "SELECT id, domain FROM domains WHERE workspace_id = $1 AND lower(domain) = $2 LIMIT 1",
      [id, domain.toLowerCase()],
    );

    if (!result.rows[0]) {
      throw new ForbiddenException("This domain does not belong to the current workspace");
    }

    return result.rows[0];
  }

  async recordDomain(workspaceId: string | undefined, domain: string) {
    const id = this.requireWorkspace(workspaceId);
    if (!id) return;

    const result = await this.database.query<{ workspace_id: string }>(
      `
        INSERT INTO domains(workspace_id, domain, status)
        VALUES ($1, $2, 'pending_dns')
        ON CONFLICT (domain) DO NOTHING
        RETURNING workspace_id
      `,
      [id, domain.toLowerCase()],
    );

    if (!result.rowCount) {
      const existing = await this.database.query<{ workspace_id: string }>(
        "SELECT workspace_id FROM domains WHERE lower(domain) = $1 LIMIT 1",
        [domain.toLowerCase()],
      );
      if (existing.rows[0]?.workspace_id !== id) {
        throw new ConflictException("This domain is already assigned to another workspace");
      }
    }
  }

  async ensureDomainAvailable(workspaceId: string | undefined, domain: string) {
    const id = this.requireWorkspace(workspaceId);
    if (!id) return;

    const existing = await this.database.query<{ workspace_id: string }>(
      "SELECT workspace_id FROM domains WHERE lower(domain) = $1 LIMIT 1",
      [domain.toLowerCase()],
    );
    if (existing.rows[0] && existing.rows[0].workspace_id !== id) {
      throw new ConflictException("This domain is already assigned to another workspace");
    }
  }

  async removeDomain(workspaceId: string | undefined, domain: string) {
    const id = this.requireWorkspace(workspaceId);
    if (!id) return;

    await this.database.query("DELETE FROM domains WHERE workspace_id = $1 AND lower(domain) = $2", [
      id,
      domain.toLowerCase(),
    ]);
  }

  async removeDomainGlobally(domain: string) {
    if (!this.database.enabled) return;
    await this.database.query("DELETE FROM domains WHERE lower(domain) = $1", [domain.toLowerCase()]);
  }

  async recordMailbox(
    workspaceId: string | undefined,
    input: { email: string; name?: string; quotaMb?: number; active?: boolean },
  ) {
    const id = this.requireWorkspace(workspaceId);
    if (!id) return;

    const domain = this.domainFromEmail(input.email);
    const domainRow = await this.ensureDomainAccess(id, domain);
    await this.database.query(
      `
        INSERT INTO mailboxes(workspace_id, domain_id, email, name, quota_mb, is_active)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (email) DO UPDATE
        SET name = EXCLUDED.name,
            quota_mb = EXCLUDED.quota_mb,
            is_active = EXCLUDED.is_active,
            updated_at = now()
      `,
      [
        id,
        domainRow?.id ?? null,
        input.email.toLowerCase(),
        input.name ?? null,
        input.quotaMb ?? 2048,
        input.active !== false,
      ],
    );
  }

  async updateMailbox(workspaceId: string | undefined, email: string, input: { name?: string; quotaMb?: number; active?: boolean }) {
    const id = this.requireWorkspace(workspaceId);
    if (!id) return;

    await this.ensureEmailAccess(id, email);
    await this.database.query(
      `
        UPDATE mailboxes
        SET name = COALESCE($3, name),
            quota_mb = COALESCE($4, quota_mb),
            is_active = COALESCE($5, is_active),
            updated_at = now()
        WHERE workspace_id = $1 AND lower(email) = $2
      `,
      [id, email.toLowerCase(), input.name ?? null, input.quotaMb ?? null, input.active ?? null],
    );
  }

  async removeMailbox(workspaceId: string | undefined, email: string) {
    const id = this.requireWorkspace(workspaceId);
    if (!id) return;

    await this.ensureEmailAccess(id, email);
    await this.database.query("DELETE FROM mailboxes WHERE workspace_id = $1 AND lower(email) = $2", [
      id,
      email.toLowerCase(),
    ]);
  }

  async removeMailboxGlobally(email: string) {
    if (!this.database.enabled) return;
    await this.database.query("DELETE FROM mailboxes WHERE lower(email) = $1", [email.toLowerCase()]);
  }

  async ensureEmailAccess(workspaceId: string | undefined, email: string) {
    const id = this.requireWorkspace(workspaceId);
    if (!id) return;

    const domain = this.domainFromEmail(email);
    await this.ensureDomainAccess(id, domain);
  }

  async recordAlias(workspaceId: string | undefined, input: { address: string; goto: string; active?: boolean }) {
    const id = this.requireWorkspace(workspaceId);
    if (!id) return;

    const domain = this.domainFromEmail(input.address);
    const domainRow = await this.ensureDomainAccess(id, domain);
    const updated = await this.database.query(
      `
        UPDATE aliases
        SET domain_id = $2,
            goto = $4,
            destination_email = $4,
            is_active = $5,
            updated_at = now()
        WHERE workspace_id = $1 AND lower(address) = $3
      `,
      [id, domainRow?.id ?? null, input.address.toLowerCase(), input.goto.toLowerCase(), input.active !== false],
    );

    if (updated.rowCount) {
      return;
    }

    await this.database.query(
      `
        INSERT INTO aliases(workspace_id, domain_id, address, goto, source_email, destination_email, is_active)
        VALUES ($1, $2, $3, $4, $3, $4, $5)
      `,
      [id, domainRow?.id ?? null, input.address.toLowerCase(), input.goto.toLowerCase(), input.active !== false],
    );
  }

  async updateAlias(
    workspaceId: string | undefined,
    idOrAddress: string,
    input: { address?: string; goto?: string; active?: boolean },
  ) {
    const id = this.requireWorkspace(workspaceId);
    if (!id) return;

    if (input.address) {
      await this.ensureEmailAccess(id, input.address);
    }

    await this.database.query(
      `
        UPDATE aliases
        SET address = COALESCE($3, address),
            source_email = COALESCE($3, source_email),
            goto = COALESCE($4, goto),
            destination_email = COALESCE($4, destination_email),
            is_active = COALESCE($5, is_active),
            updated_at = now()
        WHERE workspace_id = $1 AND (id::text = $2 OR lower(address) = $2)
      `,
      [
        id,
        idOrAddress.toLowerCase(),
        input.address?.toLowerCase() ?? null,
        input.goto?.toLowerCase() ?? null,
        input.active ?? null,
      ],
    );
  }

  async removeAlias(workspaceId: string | undefined, idOrAddress: string) {
    const id = this.requireWorkspace(workspaceId);
    if (!id) return;

    await this.database.query(
      "DELETE FROM aliases WHERE workspace_id = $1 AND (id::text = $2 OR lower(address) = $2)",
      [id, idOrAddress.toLowerCase()],
    );
  }

  async removeAliasGlobally(idOrAddress: string) {
    if (!this.database.enabled) return;
    await this.database.query("DELETE FROM aliases WHERE id::text = $1 OR lower(address) = $1", [
      idOrAddress.toLowerCase(),
    ]);
  }

  private domainFromEmail(email: string) {
    const domain = email.split("@")[1]?.toLowerCase();
    if (!domain) {
      throw new BadRequestException("A valid email address is required");
    }
    return domain;
  }
}
