import { MailboxTableClient } from "@/components/MailboxTableClient";
import { PageHeader } from "@/components/PageHeader";
import { RoleBasedLayout } from "@/components/RoleBasedLayout";
import { Mailbox } from "@/lib/platform-data";
import { apiGetSafe } from "@/lib/server-api";

export const dynamic = "force-dynamic";

export default async function AdminMailboxesPage() {
  const mailboxes = await apiGetSafe<Mailbox[]>("/api/mailboxes", []);

  return (
    <RoleBasedLayout route="/admin/mailboxes" permission="mailbox.view" crumbs={[{ label: "Admin" }, { label: "Mailboxes" }]}>
      <PageHeader title="Mailboxes" description="Mailbox directory with quota, status, IMAP/SMTP state, and admin actions." />
      <MailboxTableClient mailboxes={mailboxes.data} basePath="/admin/mailboxes" />
    </RoleBasedLayout>
  );
}
