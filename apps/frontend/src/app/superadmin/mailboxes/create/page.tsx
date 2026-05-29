import { MailboxFormClient } from "@/components/MailboxFormClient";
import { PageHeader } from "@/components/PageHeader";
import { RoleBasedLayout } from "@/components/RoleBasedLayout";
import { Domain } from "@/lib/platform-data";
import { apiGetSafe } from "@/lib/server-api";

export default async function CreateSuperAdminMailboxPage() {
  const domains = await apiGetSafe<Domain[]>("/api/domains", []);

  return (
    <RoleBasedLayout route="/superadmin/mailboxes/create" permission="mailbox.create" crumbs={[{ label: "Super Admin", href: "/superadmin/dashboard" }, { label: "Mailboxes", href: "/superadmin/mailboxes" }, { label: "Create" }]}>
      <PageHeader title="Create mailbox" description="Provision a mailbox in Mailcow and mirror it to the workspace." />
      <MailboxFormClient domains={domains.data} returnPath="/superadmin/mailboxes" />
    </RoleBasedLayout>
  );
}
