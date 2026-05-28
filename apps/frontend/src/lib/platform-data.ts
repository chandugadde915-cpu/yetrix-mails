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
