import { MailboxFormClient } from "@/components/MailboxFormClient";
import { PageHeader } from "@/components/PageHeader";
import { RoleBasedLayout } from "@/components/RoleBasedLayout";
import { Domain, Mailbox } from "@/lib/platform-data";
import { apiGetSafe } from "@/lib/server-api";
import { notFound } from "next/navigation";

export default async function SuperAdminMailboxEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [mailboxes, domains] = await Promise.all([
    apiGetSafe<Mailbox[]>("/api/mailboxes", []),
    apiGetSafe<Domain[]>("/api/domains", []),
  ]);
  const mailbox = mailboxes.data.find((item) => item.address === decodeURIComponent(id));
  if (!mailbox) notFound();

  return (
    <RoleBasedLayout route="/superadmin/mailboxes" permission="mailbox.edit" crumbs={[{ label: "Super Admin", href: "/superadmin/dashboard" }, { label: "Mailboxes", href: "/superadmin/mailboxes" }, { label: "Edit" }]}>
      <PageHeader title="Edit mailbox" description={mailbox.address} />
      <MailboxFormClient mailbox={mailbox} domains={domains.data} returnPath="/superadmin/mailboxes" />
    </RoleBasedLayout>
  );
}
