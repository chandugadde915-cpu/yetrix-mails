import { BadRequestException, Body, Controller, ForbiddenException, Get, Param, Post, Req } from "@nestjs/common";
import { AuthenticatedRequest } from "../../common/auth.middleware";
import { adminRoles, isSuperAdmin, requireRole } from "../../common/rbac";
import { AuditService } from "../audit/audit.service";
import { MailcowService } from "../mailcow/mailcow.service";
import { TenancyService } from "../tenancy/tenancy.service";
import { GenerateDkimDto } from "./dto/generate-dkim.dto";

@Controller("api/operations")
export class OperationsController {
  constructor(
    private readonly mailcow: MailcowService,
    private readonly tenancy: TenancyService,
    private readonly audit: AuditService,
  ) {}

  @Get("summary")
  async summary(@Req() req: AuthenticatedRequest) {
    const [status, domains, mailboxes, aliases] = await Promise.all([
      this.mailcow.connectionStatus(),
      this.mailcow.listDomains(),
      this.mailcow.listMailboxes(),
      this.mailcow.listAliases(),
    ]);
    const ownedDomains = isSuperAdmin(req)
      ? null
      : await this.tenancy.listDomainNames(req.user?.workspaceId);
    const owned = new Set((ownedDomains ?? []).map((domain) => domain.toLowerCase()));
    const canSee = (domain: string) => isSuperAdmin(req) || owned.has(domain.toLowerCase());

    return {
      status,
      counts: {
        domains: domains.filter((domain) => canSee(domain.domain)).length,
        mailboxes: mailboxes.filter((mailbox) => canSee(mailbox.domain)).length,
        aliases: aliases.filter((alias) => canSee(alias.address.split("@")[1] ?? "")).length,
      },
      capabilities: [
        "DKIM lookup and generation",
        "Groups and shared mailbox routing",
        "Catch-all routing",
        "Routing inventory",
        "Quarantine visibility and actions when available",
        "Delivery log visibility when available",
      ],
    };
  }

  @Get("routing")
  async routing(@Req() req: AuthenticatedRequest) {
    const ownedDomains = isSuperAdmin(req)
      ? null
      : await this.tenancy.listDomainNames(req.user?.workspaceId);
    const owned = new Set((ownedDomains ?? []).map((domain) => domain.toLowerCase()));
    const canSee = (domain: string) => isSuperAdmin(req) || owned.has(domain.toLowerCase());
    const [domains, mailboxes, aliases] = await Promise.all([
      this.mailcow.listDomains(),
      this.mailcow.listMailboxes(),
      this.mailcow.listAliases(),
    ]);

    return {
      domains: domains.filter((domain) => canSee(domain.domain)),
      mailboxes: mailboxes.filter((mailbox) => canSee(mailbox.domain)),
      aliases: aliases.filter((alias) => canSee(alias.address.split("@")[1] ?? "")),
    };
  }

  @Get("dkim/:domain")
  async getDkim(@Req() req: AuthenticatedRequest, @Param("domain") domain: string) {
    if (!isSuperAdmin(req)) {
      await this.tenancy.ensureDomainAccess(req.user?.workspaceId, domain);
    }
    return this.mailcow.safeOperation("dkim", "GET", `/get/dkim/${domain}`);
  }

  @Post("dkim/:domain")
  async generateDkim(
    @Req() req: AuthenticatedRequest,
    @Param("domain") domain: string,
    @Body() body: GenerateDkimDto,
  ) {
    requireRole(req, adminRoles);
    if (!isSuperAdmin(req)) {
      await this.tenancy.ensureDomainAccess(req.user?.workspaceId, domain);
    }
    const result = await this.mailcow.safeOperation("dkim.generate", "POST", "/add/dkim", {
      domains: [domain],
      dkim_selector: body.selector ?? "dkim",
      key_size: body.keySize ?? 2048,
    });
    await this.audit.record("dkim.generate", domain, req.user?.sub, req.user?.workspaceId);
    return result;
  }

  @Get("quarantine")
  async quarantine(@Req() req: AuthenticatedRequest) {
    requireRole(req, adminRoles);
    const ownedDomains = isSuperAdmin(req)
      ? null
      : await this.tenancy.listDomainNames(req.user?.workspaceId);
    const result = await this.mailcow.safeOperation("quarantine", "GET", "/get/quarantine/all");
    return isSuperAdmin(req) ? result : this.filterOperationByDomains(result, ownedDomains ?? []);
  }

  @Post("quarantine/:id/:action")
  async quarantineAction(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Param("action") action: string,
  ) {
    requireRole(req, adminRoles);
    const normalizedAction = this.quarantineActionName(action);

    if (!isSuperAdmin(req)) {
      const ownedDomains = await this.tenancy.listDomainNames(req.user?.workspaceId);
      await this.ensureQuarantineItemAccess(id, ownedDomains ?? []);
    }

    const result =
      normalizedAction === "delete"
        ? await this.mailcow.safeOperation("quarantine.delete", "POST", "/delete/qitem", [id])
        : await this.mailcow.safeOperation("quarantine.action", "POST", "/edit/qitem", {
            items: [id],
            attr: { action: normalizedAction },
          });
    await this.audit.record(`quarantine.${normalizedAction}`, id, req.user?.sub, req.user?.workspaceId);
    return result;
  }

  @Get("logs")
  async logs(@Req() req: AuthenticatedRequest) {
    requireRole(req, adminRoles);
    const ownedDomains = isSuperAdmin(req)
      ? null
      : await this.tenancy.listDomainNames(req.user?.workspaceId);
    const logs = await Promise.all([
      this.mailcow.safeOperation("postfix", "GET", "/get/logs/postfix/100"),
      this.mailcow.safeOperation("dovecot", "GET", "/get/logs/dovecot/100"),
      this.mailcow.safeOperation("rspamd", "GET", "/get/logs/rspamd-history/100"),
    ]);
    return isSuperAdmin(req)
      ? logs
      : logs.map((log) => this.filterOperationByDomains(log, ownedDomains ?? []));
  }

  private filterOperationByDomains<T extends { data?: unknown }>(operation: T, domains: string[]) {
    if (!operation.data) {
      return operation;
    }

    if (domains.length === 0) {
      return { ...operation, data: [] };
    }

    const lowerDomains = domains.map((domain) => domain.toLowerCase());
    return {
      ...operation,
      data: this.filterValueByDomains(operation.data, lowerDomains),
    };
  }

  private filterValueByDomains(value: unknown, lowerDomains: string[]): unknown {
    if (Array.isArray(value)) {
      return value.filter((item) => this.includesOwnedDomain(item, lowerDomains));
    }

    if (typeof value === "string") {
      return value
        .split("\n")
        .filter((line) => this.includesOwnedDomain(line, lowerDomains))
        .join("\n");
    }

    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, item]) => [
          key,
          this.filterValueByDomains(item, lowerDomains),
        ]),
      );
    }

    return value;
  }

  private includesOwnedDomain(value: unknown, lowerDomains: string[]) {
    const serialized = typeof value === "string" ? value : JSON.stringify(value);
    const text = (serialized ?? "").toLowerCase();
    return lowerDomains.some((domain) => text.includes(domain));
  }

  private quarantineActionName(action: string) {
    const normalized = action.toLowerCase();
    if (["release", "delete", "learnham", "learnspam"].includes(normalized)) {
      return normalized;
    }

    throw new BadRequestException("Unsupported quarantine action");
  }

  private async ensureQuarantineItemAccess(id: string, domains: string[]) {
    const quarantine = await this.mailcow.safeOperation("quarantine", "GET", "/get/quarantine/all");
    const rows = this.operationRows(quarantine.data);
    const item = rows.find((row) => String(row.id ?? row.qid ?? row.qhash ?? "") === id);
    if (!item || !this.includesOwnedDomain(item, domains.map((domain) => domain.toLowerCase()))) {
      throw new ForbiddenException("Quarantine item does not belong to this workspace");
    }
  }

  private operationRows(value: unknown): Array<Record<string, unknown>> {
    if (Array.isArray(value)) {
      return value.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"));
    }

    if (value && typeof value === "object") {
      return Object.values(value as Record<string, unknown>).flatMap((item) => this.operationRows(item));
    }

    return [];
  }
}
