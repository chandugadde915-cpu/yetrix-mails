import { BadRequestException, Injectable } from "@nestjs/common";
import { hashSync } from "bcryptjs";
import { randomBytes } from "crypto";
import { DatabaseService } from "../database/database.service";

interface MailboxRow {
  address: string;
  domain: string;
  quotaMb: number;
  status: "active" | "disabled";
  createdAt: string;
}

@Injectable()
export class MailboxesService {
  constructor(private readonly db: DatabaseService) {}

  async listMailboxes() {
    const result = await this.db.query<{
      email: string;
      domain: string;
      quota_mb: number;
      is_active: boolean;
      created_at: Date;
    }>(
      `SELECT m.email, d.domain, m.quota_mb, m.is_active, m.created_at
       FROM mailboxes m
       JOIN domains d ON d.id = m.domain_id
       ORDER BY m.created_at DESC
       LIMIT 200`,
    );

    return result.rows.map((row) => ({
      address: row.email,
      domain: row.domain,
      quotaMb: row.quota_mb,
      status: row.is_active ? "active" : "disabled",
      createdAt: row.created_at.toISOString(),
    }));
  }

  async createMailbox(address: string, quotaMb: number) {
    const normalizedAddress = address.trim().toLowerCase();
    const [, domain] = normalizedAddress.split("@");

    const domainResult = await this.db.query<{
      id: string;
      workspace_id: string;
      domain: string;
    }>("SELECT id, workspace_id, domain FROM domains WHERE domain = $1 LIMIT 1", [domain]);

    if (!domainResult.rows[0]) {
      throw new BadRequestException(`Domain ${domain} must be added before creating mailboxes.`);
    }

    const passwordHash = this.placeholderPasswordHash();
    const result = await this.db.query<{
      email: string;
      quota_mb: number;
      is_active: boolean;
      created_at: Date;
    }>(
      `INSERT INTO mailboxes (workspace_id, domain_id, email, password_hash, quota_mb)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING email, quota_mb, is_active, created_at`,
      [
        domainResult.rows[0].workspace_id,
        domainResult.rows[0].id,
        normalizedAddress,
        passwordHash,
        quotaMb,
      ],
    );

    const row = result.rows[0];

    return {
      address: row.email,
      domain,
      quotaMb: row.quota_mb,
      status: row.is_active ? "active" : "disabled",
      createdAt: row.created_at.toISOString(),
    } satisfies MailboxRow;
  }

  private placeholderPasswordHash() {
    return hashSync(randomBytes(32).toString("hex"), 12);
  }
}
