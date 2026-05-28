import { AppShell } from "@/components/AppShell";
import { OnboardingChecklist } from "@/components/OnboardingChecklist";
import { PageHeader } from "@/components/PageHeader";
import { StatusNotice } from "@/components/StatusNotice";
import { WorkspaceFlow } from "@/components/WorkspaceFlow";
import { WorkspaceSyncButton } from "@/components/WorkspaceSyncButton";
import { requirePageSession } from "@/lib/server-api";
import { getWorkspaceSnapshot } from "@/lib/workspace-server";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  await requirePageSession();

  const { domains, mailboxes, status, errors } = await getWorkspaceSnapshot();

  return (
    <AppShell>
      <PageHeader
        title="Launch Flow"
        description="Complete the production path from domain ownership to working send and receive mail."
      />
      <StatusNotice errors={errors} message="Some setup data is temporarily unavailable." />
      <WorkspaceSyncButton />
      <OnboardingChecklist domains={domains} mailboxes={mailboxes} status={status} />
      <WorkspaceFlow domains={domains} mailboxes={mailboxes} status={status} />
    </AppShell>
  );
}
