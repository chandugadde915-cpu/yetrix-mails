import { AppShell } from "@/components/AppShell";
import { MailWorkspaceClient } from "@/components/MailWorkspaceClient";
import { PageHeader } from "@/components/PageHeader";
import { StatusNotice } from "@/components/StatusNotice";
import { apiGetSafe, requirePageSession } from "@/lib/server-api";
import { Mailbox } from "@/lib/platform-data";

export const dynamic = "force-dynamic";

export default async function WebmailPage() {
  await requirePageSession();

  const mailboxesResult = await apiGetSafe<Mailbox[]>("/api/mailboxes", []);
  const mailboxes = mailboxesResult.data;

  return (
    <AppShell>
      <PageHeader
        title="Mail Workspace"
        description="Read inboxes and send messages from Yetrix without opening the mail engine UI."
      />
      <StatusNotice
        errors={[mailboxesResult.error]}
        message="Mailboxes are temporarily unavailable."
      />

      <MailWorkspaceClient mailboxes={mailboxes} />
    </AppShell>
  );
}
