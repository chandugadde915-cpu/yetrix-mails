import { BadRequestException, ConflictException, ForbiddenException, Injectable } from "@nestjs/common";
import { DatabaseService, DomainRow } from "../database/database.service";

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

    const domains = await this.database.listDomains(id);
    return domains.map((row) => row.domain);
  }

  async ensureDomainAccess(workspaceId: string | undefined, domain: string) {
    const id = this.requireWorkspace(workspaceId);
    if (!id) return null;

    const domainRow = await this.database.findWorkspaceDomain(id, domain);

    if (!domainRow) {
      throw new ForbiddenException("This domain does not belong to the current workspace");
    }

    return domainRow;
  }

  async findDomain(domain: string) {
    if (!this.database.enabled) return null;

    return this.database.findDomain(domain);
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

    await this.database.saveDnsRecord({
      workspaceId: domainRow.workspace_id,
      domainId: domainRow.id,
      domain,
      status,
      checks: verification.checks,
      records: verification.records,
      raw: verification.raw,
    });

    await this.database.updateDomainStatus(domainRow.id, status);

    await this.refreshWorkspaceStatus(domainRow.workspace_id);
    return verification;
  }

  async recordDomain(workspaceId: string | undefined, domain: string) {
    const id = this.requireWorkspace(workspaceId);
    if (!id) return;

    const existing = await this.database.findDomain(domain);
    if (existing && existing.workspace_id !== id) {
      throw new ConflictException("This domain is already assigned to another workspace");
    }
    await this.database.recordDomain(id, domain);

    await this.refreshWorkspaceStatus(id);
  }

  async ensureDomainAvailable(workspaceId: string | undefined, domain: string) {
    const id = this.requireWorkspace(workspaceId);
    if (!id) return;

    const existing = await this.database.findDomain(domain);
    if (existing && existing.workspace_id !== id) {
      throw new ConflictException("This domain is already assigned to another workspace");
    }
  }

  async removeDomain(workspaceId: string | undefined, domain: string) {
    const id = this.requireWorkspace(workspaceId);
    if (!id) return;

    await this.database.removeDomain(id, domain);
    await this.refreshWorkspaceStatus(id);
  }

  async removeDomainGlobally(domain: string) {
    if (!this.database.enabled) return;
    await this.database.removeDomain(null, domain);
  }

  async recordMailbox(
    workspaceId: string | undefined,
    input: { email: string; name?: string; quotaMb?: number; active?: boolean },
  ) {
    const id = this.requireWorkspace(workspaceId);
    if (!id) return;

    const domain = this.domainFromEmail(input.email);
    const domainRow = await this.ensureDomainVerified(id, domain);
    await this.database.recordMailbox({
      workspaceId: id,
      domainId: domainRow?.id ?? null,
      email: input.email,
      name: input.name ?? null,
      quotaMb: input.quotaMb,
      active: input.active,
    });
  }

  async updateMailbox(workspaceId: string | undefined, email: string, input: { name?: string; quotaMb?: number; active?: boolean }) {
    const id = this.requireWorkspace(workspaceId);
    if (!id) return;

    await this.ensureEmailAccess(id, email);
    await this.database.updateMailbox(id, email, input);
  }

  async removeMailbox(workspaceId: string | undefined, email: string) {
    const id = this.requireWorkspace(workspaceId);
    if (!id) return;

    await this.ensureEmailAccess(id, email);
    await this.database.removeMailbox(id, email);
  }

  async removeMailboxGlobally(email: string) {
    if (!this.database.enabled) return;
    await this.database.removeMailbox(null, email);
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
    await this.database.recordAlias({
      workspaceId: id,
      domainId: domainRow?.id ?? null,
      address: input.address,
      goto: input.goto,
      active: input.active,
    });
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

    await this.database.updateAlias(id, idOrAddress, input);
  }

  async removeAlias(workspaceId: string | undefined, idOrAddress: string) {
    const id = this.requireWorkspace(workspaceId);
    if (!id) return;

    await this.database.removeAlias(id, idOrAddress);
  }

  async removeAliasGlobally(idOrAddress: string) {
    if (!this.database.enabled) return;
    await this.database.removeAlias(null, idOrAddress);
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
      return this.database.findDomain(domain);
    }

    const id = this.requireWorkspace(workspaceId);
    if (!id) return null;

    return this.database.findWorkspaceDomain(id, domain);
  }

  private async refreshWorkspaceStatus(workspaceId?: string) {
    if (!this.database.enabled || !workspaceId) return;

    await this.database.updateWorkspaceStatusFromDomains(workspaceId);
  }
}
