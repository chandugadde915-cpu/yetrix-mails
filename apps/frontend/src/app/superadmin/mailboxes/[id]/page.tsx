import { MailboxDetailPanel } from "@/components/MailboxFormClient";
import { PageHeader } from "@/components/PageHeader";
import { RoleBasedLayout } from "@/components/RoleBasedLayout";
import { Mailbox } from "@/lib/platform-data";
import { apiGetSafe } from "@/lib/server-api";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function SuperAdminMailboxViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const mailboxes = await apiGetSafe<Mailbox[]>("/api/mailboxes", []);
  const mailbox = mailboxes.data.find((item) => item.address === decodeURIComponent(id));
  if (!mailbox) notFound();

  return (
    <RoleBasedLayout route="/superadmin/mailboxes" permission="mailbox.view" crumbs={[{ label: "Super Admin", href: "/superadmin/dashboard" }, { label: "Mailboxes", href: "/superadmin/mailboxes" }, { label: mailbox.address }]}>
      <PageHeader title={mailbox.address} description="Mailbox details, quota, and access state." actions={<Link className="button" href={`/superadmin/mailboxes/${encodeURIComponent(mailbox.address)}/edit`}>Edit mailbox</Link>} />
      <MailboxDetailPanel mailbox={mailbox} />
    </RoleBasedLayout>
  );
}
