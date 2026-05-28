import { Domain, Mailbox, PlatformStatus } from "@/lib/platform-data";
import { apiGetSafe, SafeApiResult } from "@/lib/server-api";

export interface WorkspaceSnapshot {
  domains: Domain[];
  mailboxes: Mailbox[];
  status: PlatformStatus;
  results: {
    domains: SafeApiResult<Domain[]>;
    mailboxes: SafeApiResult<Mailbox[]>;
    status: SafeApiResult<PlatformStatus>;
  };
  errors: string[];
}

export const defaultPlatformStatus: PlatformStatus = {
  api: { healthy: false },
  mailcow: { connected: false },
};

export async function getWorkspaceSnapshot(): Promise<WorkspaceSnapshot> {
  const [domains, mailboxes, status] = await Promise.all([
    apiGetSafe<Domain[]>("/api/domains", []),
    apiGetSafe<Mailbox[]>("/api/mailboxes", []),
    apiGetSafe<PlatformStatus>("/api/status", defaultPlatformStatus),
  ]);

  return {
    domains: domains.data,
    mailboxes: mailboxes.data,
    status: status.data,
    results: {
      domains,
      mailboxes,
      status,
    },
    errors: [domains.error, mailboxes.error, status.error].filter(Boolean) as string[],
  };
}
