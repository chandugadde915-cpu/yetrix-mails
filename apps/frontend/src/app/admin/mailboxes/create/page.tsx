import { MailboxFormClient } from "@/components/MailboxFormClient";
import { PageHeader } from "@/components/PageHeader";
import { RoleBasedLayout } from "@/components/RoleBasedLayout";
import { Domain } from "@/lib/platform-data";
import { apiGetSafe } from "@/lib/server-api";

export default async function AdminMailboxCreatePage() {
  const domains = await apiGetSafe<Domain[]>("/api/domains", []);

  return (
    <RoleBasedLayout route="/admin/mailboxes/create" permission="mailbox.create" crumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Mailboxes", href: "/admin/mailboxes" }, { label: "Create" }]}>
      <PageHeader title="Create mailbox" description="Create a business email account for a verified domain." />
      <MailboxFormClient domains={domains.data} returnPath="/admin/mailboxes" />
    </RoleBasedLayout>
  );
}
