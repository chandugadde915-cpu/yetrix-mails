import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

type MailcowMethod = "GET" | "POST";
type MailcowResponse = Array<{ type?: string; msg?: unknown; log?: unknown }> | unknown;
const minimumMailboxQuotaMb = 1024;

export interface DomainRecord {
  type: "MX" | "A" | "SPF" | "DKIM" | "DMARC";
  name: string;
  value: string;
  status: "placeholder";
}

@Injectable()
export class MailcowService {
  private readonly baseUrl?: string;
  private readonly apiKey?: string;
  private readonly mailServerIp: string;
  private readonly timeoutMs: number;
  private readonly cacheTtlMs: number;
  private readonly cache = new Map<string, { expiresAt: number; value: unknown }>();

  constructor(config: ConfigService) {
    this.baseUrl = config.get<string>("MAILCOW_BASE_URL")?.replace(/\/$/, "");
    this.apiKey = config.get<string>("MAILCOW_API_KEY");
    this.mailServerIp = config.get<string>("MAIL_SERVER_IP", "56.228.11.175");
    this.timeoutMs = Number(config.get<string>("MAILCOW_API_TIMEOUT_MS", "5000"));
    this.cacheTtlMs = Number(config.get<string>("MAILCOW_CACHE_TTL_MS", "15000"));
  }

  async connectionStatus() {
    if (!this.baseUrl || !this.apiKey) {
      return {
        connected: false,
        mailcowBaseUrl: this.baseUrl ?? null,
        error: "MAILCOW_BASE_URL or MAILCOW_API_KEY is missing",
      };
    }

    try {
      await this.cached("connectionStatus", () => this.request("GET", "/get/domain/all"));
      return {
        connected: true,
        mailcowBaseUrl: this.baseUrl,
      };
    } catch (error) {
      return {
        connected: false,
        mailcowBaseUrl: this.baseUrl,
        error: error instanceof Error ? error.message : "Mailcow connection failed",
      };
    }
  }

  async listDomains() {
    const response = await this.cached("domains", () => this.request("GET", "/get/domain/all"));
    const rows = this.asObjectRows(response);
    return rows.map((row) => this.normalizeDomain(row));
  }

  async findDomain(domain: string) {
    const normalized = domain.trim().toLowerCase();
    const domains = await this.listDomains();
    return domains.find((item) => item.domain.toLowerCase() === normalized) ?? null;
  }

  async addDomain(input: { domain: string; description?: string }) {
    const domain = input.domain.trim().toLowerCase();
    const response = await this.request("POST", "/add/domain", {
      domain,
      description: input.description ?? "",
      aliases: 400,
      mailboxes: 100,
      defquota: 3072,
      maxquota: 10240,
      quota: 102400,
      active: "1",
      backupmx: "0",
      relay_all_recipients: "0",
      restart_sogo: "0",
      rl_frame: "s",
      rl_value: 10,
    });
    this.assertMailcowSuccess(response);
    this.clearCache();
    return { domain, result: response };
  }

  async deleteDomain(domain: string) {
    const response = await this.request("POST", "/delete/domain", [domain]);
    this.assertMailcowSuccess(response);
    this.clearCache();
    return { domain, result: response };
  }

  async listMailboxes() {
    const response = await this.cached("mailboxes", () => this.request("GET", "/get/mailbox/all"));
    const rows = this.asObjectRows(response);
    return rows.map((row) => this.normalizeMailbox(row));
  }

  async addMailbox(input: {
    email: string;
    name?: string;
    password: string;
    quotaMb?: number;
    active?: boolean;
  }) {
    const { localPart, domain } = this.splitEmail(input.email);
    const response = await this.request("POST", "/add/mailbox", {
      local_part: localPart,
      domain,
      name: input.name ?? localPart,
      quota: this.mailboxQuota(input.quotaMb),
      password: input.password,
      password2: input.password,
      active: input.active === false ? "0" : "1",
      force_pw_update: "0",
      tls_enforce_in: "1",
      tls_enforce_out: "1",
    });
    this.assertMailcowSuccess(response);
    this.clearCache();
    return { email: input.email.toLowerCase(), result: response };
  }

  async editMailbox(email: string, input: { name?: string; quotaMb?: number; active?: boolean }) {
    const attr: Record<string, string | number> = {};
    if (input.name !== undefined) attr.name = input.name;
    if (input.quotaMb !== undefined) attr.quota = this.mailboxQuota(input.quotaMb);
    if (input.active !== undefined) attr.active = input.active ? "1" : "0";

    if (Object.keys(attr).length === 0) {
      throw new BadRequestException("At least one mailbox field must be provided");
    }

    const response = await this.request("POST", "/edit/mailbox", {
      items: [email],
      attr,
    });
    this.assertMailcowSuccess(response);
    this.clearCache();
    return { email, result: response };
  }

  async resetMailboxPassword(email: string, password: string) {
    const response = await this.request("POST", "/edit/mailbox", {
      items: [email],
      attr: {
        password,
        password2: password,
      },
    });
    this.assertMailcowSuccess(response);
    this.clearCache();
    return { email, result: response };
  }

  async setMailboxActive(email: string, active: boolean) {
    return this.editMailbox(email, { active });
  }

  async deleteMailbox(email: string) {
    const response = await this.request("POST", "/delete/mailbox", [email]);
    this.assertMailcowSuccess(response);
    this.clearCache();
    return { email, result: response };
  }

  async listAliases() {
    const response = await this.cached("aliases", () => this.request("GET", "/get/alias/all"));
    const rows = this.asObjectRows(response);
    return rows.map((row) => this.normalizeAlias(row));
  }

  async addAlias(input: { address: string; goto: string; active?: boolean }) {
    const response = await this.request("POST", "/add/alias", {
      address: input.address.toLowerCase(),
      goto: input.goto.toLowerCase(),
      active: input.active === false ? "0" : "1",
      sogo_visible: false,
    });
    this.assertMailcowSuccess(response);
    this.clearCache();
    return { address: input.address.toLowerCase(), result: response };
  }

  async editAlias(id: string, input: { address?: string; goto?: string; active?: boolean }) {
    const attr: Record<string, string | boolean> = {};
    if (input.address !== undefined) attr.address = input.address.toLowerCase();
    if (input.goto !== undefined) attr.goto = input.goto.toLowerCase();
    if (input.active !== undefined) attr.active = input.active ? "1" : "0";

    if (Object.keys(attr).length === 0) {
      throw new BadRequestException("At least one alias field must be provided");
    }

    const response = await this.request("POST", "/edit/alias", {
      items: [id],
      attr,
    });
    this.assertMailcowSuccess(response);
    this.clearCache();
    return { id, result: response };
  }

  async deleteAlias(id: string) {
    const response = await this.request("POST", "/delete/alias", [id]);
    this.assertMailcowSuccess(response);
    this.clearCache();
    return { id, result: response };
  }

  async operation<T = unknown>(method: MailcowMethod, path: string, body?: unknown) {
    return this.request<T>(method, path, body);
  }

  async safeOperation<T = unknown>(label: string, method: MailcowMethod, path: string, body?: unknown) {
    try {
      return {
        label,
        supported: true,
        data: await this.operation<T>(method, path, body),
      };
    } catch (error) {
      return {
        label,
        supported: false,
        error: error instanceof Error ? error.message : "Mailcow operation failed",
      };
    }
  }

  dnsPlaceholders(domain: string): DomainRecord[] {
    const mailHost = `mail.${domain}`;
    return [
      {
        type: "MX",
        name: domain,
        value: `10 ${mailHost}`,
        status: "placeholder",
      },
      {
        type: "A",
        name: mailHost,
        value: this.mailServerIp,
        status: "placeholder",
      },
      {
        type: "SPF",
        name: domain,
        value: `v=spf1 mx ip4:${this.mailServerIp} ~all`,
        status: "placeholder",
      },
      {
        type: "DKIM",
        name: `dkim._domainkey.${domain}`,
        value: "Generated by Mailcow after DKIM key creation",
        status: "placeholder",
      },
      {
        type: "DMARC",
        name: `_dmarc.${domain}`,
        value: `v=DMARC1; p=quarantine; rua=mailto:dmarc@${domain}`,
        status: "placeholder",
      },
    ];
  }

  private async request<T = MailcowResponse>(
    method: MailcowMethod,
    path: string,
    body?: unknown,
  ): Promise<T> {
    if (!this.baseUrl || !this.apiKey) {
      throw new ServiceUnavailableException("Mailcow API environment is not configured");
    }

    const response = await fetch(`${this.baseUrl}/api/v1${path}`, {
      method,
      signal: AbortSignal.timeout(Number.isFinite(this.timeoutMs) ? this.timeoutMs : 5000),
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": this.apiKey,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const text = await response.text();
    const parsed = text ? this.parseJson(text) : null;

    if (!response.ok) {
      throw new BadGatewayException(
        `Mailcow API ${response.status}: ${this.mailcowMessage(parsed)}`,
      );
    }

    return parsed as T;
  }

  private async cached<T>(key: string, loader: () => Promise<T>) {
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value as T;
    }

    const value = await loader();
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + (Number.isFinite(this.cacheTtlMs) ? this.cacheTtlMs : 15000),
    });
    return value;
  }

  private clearCache() {
    this.cache.clear();
  }

  private parseJson(text: string) {
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return text;
    }
  }

  private assertMailcowSuccess(response: unknown) {
    if (!Array.isArray(response)) return;

    const failure = response.find((item) => {
      if (!item || typeof item !== "object") return false;
      const type = "type" in item ? String(item.type) : "";
      return type === "danger" || type === "error";
    });

    if (failure) {
      throw new BadGatewayException(this.mailcowMessage(failure));
    }
  }

  private mailcowMessage(value: unknown): string {
    if (typeof value === "string") return value;
    if (Array.isArray(value)) return value.map((item) => this.mailcowMessage(item)).join("; ");
    if (value && typeof value === "object") {
      const object = value as Record<string, unknown>;
      if (object.msg) return this.mailcowMessage(object.msg);
      return JSON.stringify(object);
    }
    return "Unexpected Mailcow response";
  }

  private asObjectRows(value: unknown): Array<Record<string, unknown>> {
    if (Array.isArray(value)) {
      return value.filter(this.isObjectRow);
    }

    if (!value || typeof value !== "object") {
      return [];
    }

    const object = value as Record<string, unknown>;
    const nestedRows = object.data ?? object.items ?? object.response;

    if (Array.isArray(nestedRows)) {
      return nestedRows.filter(this.isObjectRow);
    }

    return Object.values(object).filter(this.isObjectRow);
  }

  private isObjectRow(value: unknown): value is Record<string, unknown> {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
  }

  private splitEmail(email: string) {
    const normalized = email.trim().toLowerCase();
    const [localPart, domain] = normalized.split("@");
    if (!localPart || !domain) {
      throw new BadRequestException("A valid email address is required");
    }
    return { localPart, domain };
  }

  private normalizeDomain(row: Record<string, unknown>) {
    const domain = String(row.domain ?? row.domain_name ?? "");
    const active = String(row.active ?? "0") === "1";
    return {
      domain,
      status: active ? "active" : "inactive",
      active,
      mailboxes: Number(row.mboxes_in_domain ?? row.mailboxes ?? row.mbox_count ?? 0),
      aliases: Number(row.aliases_in_domain ?? row.aliases ?? 0),
      quotaMb: this.toMb(row.quota),
      maxQuotaMb: this.toMb(row.maxquota),
      createdAt: row.created ?? row.created_at ?? null,
      records: this.dnsPlaceholders(domain),
      raw: row,
    };
  }

  private normalizeMailbox(row: Record<string, unknown>) {
    const address = String(row.username ?? row.email ?? "");
    return {
      address,
      name: String(row.name ?? address.split("@")[0] ?? ""),
      domain: String(row.domain ?? address.split("@")[1] ?? ""),
      quotaMb: this.toMb(row.quota),
      usedMb: this.toMb(row.quota_used),
      status: String(row.active ?? "0") === "1" ? "active" : "disabled",
      active: String(row.active ?? "0") === "1",
      messages: Number(row.messages ?? 0),
      percentInUse: Number(row.percent_in_use ?? 0),
      lastLogin: row.last_imap_login ?? row.last_smtp_login ?? null,
      aliases: [],
      raw: row,
    };
  }

  private normalizeAlias(row: Record<string, unknown>) {
    return {
      id: String(row.id ?? row.address ?? ""),
      address: String(row.address ?? ""),
      goto: String(row.goto ?? ""),
      status: String(row.active ?? "0") === "1" ? "active" : "disabled",
      active: String(row.active ?? "0") === "1",
      createdAt: row.created ?? null,
      raw: row,
    };
  }

  private toMb(value: unknown) {
    const numeric = Number(value ?? 0);
    if (!Number.isFinite(numeric)) return 0;
    return numeric > 1024 * 1024 ? Math.round(numeric / 1024 / 1024) : numeric;
  }

  private mailboxQuota(value: number | undefined) {
    return Math.max(value ?? 2048, minimumMailboxQuotaMb);
  }
}
