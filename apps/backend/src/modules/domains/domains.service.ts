import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";

type DomainStatus = "pending_dns" | "active";

interface DomainRow {
  domain: string;
  status: DomainStatus;
  createdAt: string;
}

@Injectable()
export class DomainsService {
  constructor(private readonly db: DatabaseService) {}

  async listDomains() {
    const result = await this.db.query<{
      domain: string;
      status: DomainStatus;
      created_at: Date;
    }>(
      "SELECT domain, status, created_at FROM domains ORDER BY created_at DESC LIMIT 100",
    );

    return result.rows.map((row) => ({
      domain: row.domain,
      status: row.status,
      createdAt: row.created_at.toISOString(),
    }));
  }

  async createDomain(domain: string) {
    const normalizedDomain = domain.trim().toLowerCase();
    const workspace = await this.ensureDefaultWorkspace();
    const result = await this.db.query<{
      domain: string;
      status: DomainStatus;
      created_at: Date;
    }>(
      `INSERT INTO domains (workspace_id, domain, status)
       VALUES ($1, $2, 'pending_dns')
       ON CONFLICT (domain) DO UPDATE SET domain = EXCLUDED.domain
       RETURNING domain, status, created_at`,
      [workspace.id, normalizedDomain],
    );

    const row = result.rows[0];

    return {
      domain: {
        domain: row.domain,
        status: row.status,
        createdAt: row.created_at.toISOString(),
      } satisfies DomainRow,
      dnsRecords: this.requiredDnsRecords(normalizedDomain),
    };
  }

  requiredDnsRecords(domain: string) {
    return [
      {
        type: "MX",
        name: domain,
        value: "mail.yourmailplatform.com",
        priority: 10,
      },
      {
        type: "TXT",
        name: domain,
        value: "v=spf1 mx include:yourmailplatform.com ~all",
      },
      {
        type: "TXT",
        name: `default._domainkey.${domain}`,
        value: "v=DKIM1; k=rsa; p=REPLACE_WITH_PUBLIC_KEY",
      },
      {
        type: "TXT",
        name: `_dmarc.${domain}`,
        value: "v=DMARC1; p=quarantine; rua=mailto:dmarc@yourmailplatform.com",
      },
    ];
  }

  private async ensureDefaultWorkspace() {
    const existing = await this.db.query<{ id: string }>(
      "SELECT id FROM workspaces ORDER BY created_at ASC LIMIT 1",
    );

    if (existing.rows[0]) {
      return existing.rows[0];
    }

    const created = await this.db.query<{ id: string }>(
      "INSERT INTO workspaces (name) VALUES ('Default Workspace') RETURNING id",
    );
    return created.rows[0];
  }
}
