import { MailboxFormClient } from "@/components/MailboxFormClient";
import { PageHeader } from "@/components/PageHeader";
import { RoleBasedLayout } from "@/components/RoleBasedLayout";
import { Domain, Mailbox } from "@/lib/platform-data";
import { apiGetSafe } from "@/lib/server-api";
import { notFound } from "next/navigation";

export default async function AdminMailboxEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [mailboxes, domains] = await Promise.all([
    apiGetSafe<Mailbox[]>("/api/mailboxes", []),
    apiGetSafe<Domain[]>("/api/domains", []),
  ]);
  const mailbox = mailboxes.data.find((item) => item.address === decodeURIComponent(id));
  if (!mailbox) notFound();

  return (
    <RoleBasedLayout route="/admin/mailboxes" permission="mailbox.edit" crumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Mailboxes", href: "/admin/mailboxes" }, { label: "Edit" }]}>
      <PageHeader title="Edit mailbox" description={mailbox.address} />
      <MailboxFormClient mailbox={mailbox} domains={domains.data} returnPath="/admin/mailboxes" />
    </RoleBasedLayout>
  );
}
