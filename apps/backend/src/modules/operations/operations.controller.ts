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
    const scopedLogs = isSuperAdmin(req)
      ? logs
      : logs.map((log) => this.filterOperationByDomains(log, ownedDomains ?? []));

    return scopedLogs.map((log) => this.sanitizeLogOperation(log));
  }

  private sanitizeLogOperation(operation: {
    label: string;
    supported: boolean;
    data?: unknown;
    error?: string;
  }) {
    const entries = this.logEntriesFromValue(operation.data)
      .map((entry) => ({
        time: this.safeLogTime(entry.time),
        severity: this.logSeverity(entry.message, entry.severity),
        event: this.safeLogText(entry.message),
      }))
      .filter((entry) => entry.event)
      .slice(0, 25);

    return {
      label: operation.label,
      supported: operation.supported,
      error: operation.error,
      data: {
        service: operation.label,
        entries,
        note:
          entries.length > 0
            ? "Sanitized delivery events. Network addresses and infrastructure details are hidden."
            : "No recent delivery events are available for this service.",
      },
    };
  }

  private logEntriesFromValue(value: unknown): Array<{ time?: unknown; severity?: unknown; message: string }> {
    if (!value) {
      return [];
    }

    if (typeof value === "string") {
      return value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => ({ message: line }));
    }

    if (Array.isArray(value)) {
      return value.flatMap((item) => this.logEntriesFromValue(item));
    }

    if (typeof value === "object") {
      const object = value as Record<string, unknown>;
      const message = object.message ?? object.msg ?? object.log ?? object.event ?? object.text;
      if (message !== undefined) {
        return [
          {
            time:
              object.time ??
              object.timestamp ??
              object.ts ??
              object.created ??
              object.created_at ??
              object.date,
            severity: object.level ?? object.severity ?? object.priority,
            message: String(message),
          },
        ];
      }

      return Object.entries(object).flatMap(([key, item]) =>
        this.logEntriesFromValue(item).map((entry) => ({ ...entry, time: entry.time ?? key })),
      );
    }

    return [{ message: String(value) }];
  }

  private safeLogTime(value: unknown) {
    if (value === undefined || value === null || value === "") {
      return "Recent";
    }

    const text = String(value);
    const numeric = Number(text);
    const date =
      Number.isFinite(numeric) && /^\d+$/.test(text)
        ? new Date(numeric < 10_000_000_000 ? numeric * 1000 : numeric)
        : new Date(text);

    if (Number.isNaN(date.getTime())) {
      return "Recent";
    }

    return date.toISOString();
  }

  private logSeverity(message: string, explicit?: unknown) {
    const value = String(explicit ?? message).toLowerCase();
    if (/(fatal|panic|critical|error|reject|failed|denied|timeout|warning|warn)/.test(value)) {
      return "attention";
    }
    if (/(sent|delivered|accepted|ok|success|login)/.test(value)) {
      return "ok";
    }
    return "info";
  }

  private safeLogText(message: string) {
    return message
      .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, "[network]")
      .replace(/\b[0-9a-f:]{2,}:[0-9a-f:]{2,}\b/gi, "[network]")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 280);
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
