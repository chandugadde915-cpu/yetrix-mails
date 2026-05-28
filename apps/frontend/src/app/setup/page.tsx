import { AppShell } from "@/components/AppShell";
import { WorkspaceFlow } from "@/components/WorkspaceFlow";
import { WorkspaceSyncButton } from "@/components/WorkspaceSyncButton";
import { Domain, Mailbox, PlatformStatus } from "@/lib/platform-data";
import { apiGetSafe, requireAuthToken } from "@/lib/server-api";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  if (!(await requireAuthToken())) {
    redirect("/login");
  }

  const [domains, mailboxes, status] = await Promise.all([
    apiGetSafe<Domain[]>("/api/domains", []),
    apiGetSafe<Mailbox[]>("/api/mailboxes", []),
    apiGetSafe<PlatformStatus>("/api/status", {
      api: { healthy: false },
      mailcow: { connected: false },
    }),
  ]);
  const loadErrors = [domains.error, mailboxes.error, status.error].filter(Boolean);

  return (
    <AppShell>
      <div className="title">
        <h1>Launch Flow</h1>
        <p>Complete the production path from domain ownership to working send and receive mail.</p>
      </div>
      {loadErrors.length > 0 ? (
        <div className="notice warn-notice">Some setup data is temporarily unavailable.</div>
      ) : null}
      <WorkspaceSyncButton />
      <WorkspaceFlow domains={domains.data} mailboxes={mailboxes.data} status={status.data} />
    </AppShell>
  );
}
