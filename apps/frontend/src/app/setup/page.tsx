import { AppShell } from "@/components/AppShell";
import { WorkspaceFlow } from "@/components/WorkspaceFlow";
import { WorkspaceSyncButton } from "@/components/WorkspaceSyncButton";
import { Domain, Mailbox, PlatformStatus } from "@/lib/platform-data";
import { apiGet, requireAuthToken } from "@/lib/server-api";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  if (!(await requireAuthToken())) {
    redirect("/login");
  }

  const [domains, mailboxes, status] = await Promise.all([
    apiGet<Domain[]>("/api/domains"),
    apiGet<Mailbox[]>("/api/mailboxes"),
    apiGet<PlatformStatus>("/api/status"),
  ]);

  return (
    <AppShell>
      <div className="title">
        <h1>Launch Flow</h1>
        <p>Complete the production path from domain ownership to working send and receive mail.</p>
      </div>
      <WorkspaceSyncButton />
      <WorkspaceFlow domains={domains} mailboxes={mailboxes} status={status} />
    </AppShell>
  );
}
