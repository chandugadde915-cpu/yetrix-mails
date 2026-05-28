export type RecordStatus = "verified" | "missing" | "placeholder";

export interface DomainRecord {
  type: "MX" | "SPF" | "DKIM" | "DMARC";
  name: string;
  value: string;
  status: RecordStatus;
}

export interface Domain {
  domain: string;
  status: "active" | "inactive" | "pending" | string;
  active?: boolean;
  mailboxes?: number;
  aliases?: number;
  quotaMb?: number;
  maxQuotaMb?: number;
  createdAt?: string | null;
  records?: DomainRecord[];
}

export interface Mailbox {
  address: string;
  name?: string;
  domain: string;
  quotaMb: number;
  usedMb?: number;
  status: "active" | "disabled" | "inactive" | string;
  active?: boolean;
  messages?: number;
  percentInUse?: number;
  lastLogin?: string | null;
}

export interface PlatformStatus {
  api?: { healthy: boolean; timestamp?: string };
  mailcow?: { connected: boolean; mailcowBaseUrl?: string; error?: string };
}

export const mailAccess = {
  webmailUrl: "https://mail.yetrixtechnologies.com/SOGo/",
  host: "mail.yetrixtechnologies.com",
  imap: {
    port: 993,
    security: "SSL/TLS",
  },
  smtp: {
    port: 587,
    security: "STARTTLS",
  },
};

export function formatStorage(mb: number) {
  if (!Number.isFinite(mb) || mb <= 0) {
    return "0 MB";
  }

  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(mb % 1024 === 0 ? 0 : 1)} GB`;
  }

  return `${mb} MB`;
}

export function usagePercent(usedMb: number, quotaMb: number) {
  if (!Number.isFinite(usedMb) || !Number.isFinite(quotaMb) || quotaMb <= 0) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round((usedMb / quotaMb) * 100)));
}

export function domainHealth(domain: Domain) {
  const records = domain.records ?? [];
  const verified = records.filter((record) => record.status === "verified").length;
  const total = records.length;

  if (total === 0) {
    return {
      verified,
      total,
      label: domain.status === "active" ? "Active" : "Pending DNS",
      healthy: domain.status === "active",
    };
  }

  return {
    verified,
    total,
    label: verified === total ? "All records verified" : `${verified}/${total} records verified`,
    healthy: verified === total,
  };
}

export function workspaceProgress(domains: Domain[], mailboxes: Mailbox[], status?: PlatformStatus) {
  const verifiedDomains = domains.filter((domain) => domainHealth(domain).healthy);
  const activeMailboxes = mailboxes.filter((mailbox) => mailbox.status === "active");
  const steps = [
    {
      title: "Mail engine connected",
      detail: status?.mailcow?.connected
        ? "Mailcow API is reachable through the backend."
        : "Connect Mailcow API before provisioning workspaces.",
      complete: Boolean(status?.mailcow?.connected),
      href: "/settings",
    },
    {
      title: "Domain created",
      detail:
        domains.length > 0
          ? `${domains.length} domain${domains.length === 1 ? "" : "s"} available for mail hosting.`
          : "Add the customer domain you want to host.",
      complete: domains.length > 0,
      href: "/domains#domain-create",
    },
    {
      title: "DNS verified",
      detail:
        verifiedDomains.length > 0
          ? `${verifiedDomains.length} domain${verifiedDomains.length === 1 ? "" : "s"} ready for routing.`
          : "Verify MX, SPF, DKIM, and DMARC records.",
      complete: verifiedDomains.length > 0,
      href: "/domains",
    },
    {
      title: "Mailbox created",
      detail:
        activeMailboxes.length > 0
          ? `${activeMailboxes.length} active mailbox${activeMailboxes.length === 1 ? "" : "es"} ready.`
          : "Create the first user mailbox.",
      complete: activeMailboxes.length > 0,
      href: "/mailboxes#mailbox-create",
    },
    {
      title: "Webmail ready",
      detail:
        activeMailboxes.length > 0
          ? "Users can sign in to webmail and mobile mail apps."
          : "Create a mailbox before opening the mail workspace.",
      complete: activeMailboxes.length > 0,
      href: "/webmail",
    },
  ];

  return {
    steps,
    completed: steps.filter((step) => step.complete).length,
    total: steps.length,
    percent: Math.round((steps.filter((step) => step.complete).length / steps.length) * 100),
    readyToSendReceive: steps.every((step) => step.complete),
  };
}
