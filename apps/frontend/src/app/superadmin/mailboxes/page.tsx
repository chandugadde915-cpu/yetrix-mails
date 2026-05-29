import { MailboxTableClient } from "@/components/MailboxTableClient";
import { PageHeader } from "@/components/PageHeader";
import { RoleBasedLayout } from "@/components/RoleBasedLayout";
import { Mailbox } from "@/lib/platform-data";
import { apiGetSafe } from "@/lib/server-api";

export const dynamic = "force-dynamic";

export default async function SuperAdminMailboxesPage() {
  const mailboxes = await apiGetSafe<Mailbox[]>("/api/mailboxes", []);

  return (
    <RoleBasedLayout route="/superadmin/mailboxes" permission="mailbox.view" crumbs={[{ label: "Super Admin" }, { label: "Mailboxes" }]}>
      <PageHeader title="Global Mailboxes" description="All hosted mailbox users across workspaces." />
      <MailboxTableClient mailboxes={mailboxes.data} basePath="/superadmin/mailboxes" showWorkspace />
    </RoleBasedLayout>
  );
}
