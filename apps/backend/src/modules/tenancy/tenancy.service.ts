import { BadRequestException, ConflictException, ForbiddenException, Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";

interface DomainRow {
  id: string;
  workspace_id?: string;
  domain: string;
  status?: string;
}

interface DnsVerification {
  domain: string;
  verified?: boolean;
  checks: Record<string, boolean>;
  records: Array<Record<string, unknown>>;
  raw: Record<string, unknown>;
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

  async findDomain(domain: string) {
    if (!this.database.enabled) return null;

    const result = await this.database.query<DomainRow>(
      "SELECT id, workspace_id, domain, status FROM domains WHERE lower(domain) = $1 LIMIT 1",
      [domain.toLowerCase()],
    );
    return result.rows[0] ?? null;
  }

  async recordDnsCheck(
    workspaceId: string | undefined,
    domain: string,
    verification: DnsVerification,
    includeAll = false,
  ) {
    if (!this.database.enabled) return verification;

    const domainRow = await this.resolveDomainRow(workspaceId, domain, includeAll);
    if (!domainRow) return verification;

    const verified = Boolean(verification.verified ?? Object.values(verification.checks).every(Boolean));
    const status = verified ? "verified" : "pending_dns";

    await this.database.query(
      `
        INSERT INTO dns_checks(workspace_id, domain_id, domain, status, checks, records, raw)
        VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb)
      `,
      [
        domainRow.workspace_id,
        domainRow.id,
        domain.toLowerCase(),
        status,
        JSON.stringify(verification.checks),
        JSON.stringify(verification.records),
        JSON.stringify(verification.raw),
      ],
    );

    await this.database.query(
      `
        UPDATE domains
        SET status = $2,
            verified_at = CASE WHEN $2 = 'verified' THEN now() ELSE verified_at END,
            last_dns_check_at = now(),
            updated_at = now()
        WHERE id = $1
      `,
      [domainRow.id, status],
    );

    await this.refreshWorkspaceStatus(domainRow.workspace_id);
    return verification;
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

    await this.refreshWorkspaceStatus(id);
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
    await this.refreshWorkspaceStatus(id);
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
    const domainRow = await this.ensureDomainVerified(id, domain);
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
        Math.max(input.quotaMb ?? 2048, 1024),
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
      [
        id,
        email.toLowerCase(),
        input.name ?? null,
        input.quotaMb === undefined ? null : Math.max(input.quotaMb, 1024),
        input.active ?? null,
      ],
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

  async ensureEmailDomainVerified(workspaceId: string | undefined, email: string, includeAll = false) {
    if (!this.database.enabled) return;

    const domain = this.domainFromEmail(email);
    await this.ensureDomainVerified(workspaceId, domain, includeAll);
  }

  async ensureDomainVerified(workspaceId: string | undefined, domain: string, includeAll = false) {
    if (!this.database.enabled) return null;

    const domainRow = await this.resolveDomainRow(workspaceId, domain, includeAll);
    if (!domainRow) {
      throw new ForbiddenException("This domain does not belong to the current workspace");
    }

    if (domainRow.status !== "verified") {
      throw new ForbiddenException("Verify domain DNS before creating mailboxes");
    }

    return domainRow;
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

  private async resolveDomainRow(workspaceId: string | undefined, domain: string, includeAll = false) {
    if (!this.database.enabled) return null;

    if (includeAll) {
      const result = await this.database.query<DomainRow>(
        "SELECT id, workspace_id, domain, status FROM domains WHERE lower(domain) = $1 LIMIT 1",
        [domain.toLowerCase()],
      );
      return result.rows[0] ?? null;
    }

    const id = this.requireWorkspace(workspaceId);
    if (!id) return null;

    const result = await this.database.query<DomainRow>(
      "SELECT id, workspace_id, domain, status FROM domains WHERE workspace_id = $1 AND lower(domain) = $2 LIMIT 1",
      [id, domain.toLowerCase()],
    );
    return result.rows[0] ?? null;
  }

  private async refreshWorkspaceStatus(workspaceId?: string) {
    if (!this.database.enabled || !workspaceId) return;

    const result = await this.database.query<{ verified_domains: string }>(
      "SELECT count(*) AS verified_domains FROM domains WHERE workspace_id = $1 AND status = 'verified'",
      [workspaceId],
    );
    const status = Number(result.rows[0]?.verified_domains ?? 0) > 0 ? "active" : "pending";
    await this.database.query("UPDATE workspaces SET status = $2, updated_at = now() WHERE id = $1", [
      workspaceId,
      status,
    ]);
  }
}
