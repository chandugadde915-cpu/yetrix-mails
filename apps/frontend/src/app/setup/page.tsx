import { AppShell } from "@/components/AppShell";
import { OnboardingChecklist } from "@/components/OnboardingChecklist";
import { PageHeader } from "@/components/PageHeader";
import { SaasProductFlow } from "@/components/SaasProductFlow";
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
        title="Product Flow"
        description="Role-based SaaS screens from signup to hosted mail operations."
      />
      <StatusNotice errors={errors} message="Some setup data is temporarily unavailable." />
      <WorkspaceSyncButton />
      <OnboardingChecklist domains={domains} mailboxes={mailboxes} status={status} />
      <SaasProductFlow domains={domains} mailboxes={mailboxes} status={status} />
      <WorkspaceFlow domains={domains} mailboxes={mailboxes} status={status} />
    </AppShell>
  );
}
