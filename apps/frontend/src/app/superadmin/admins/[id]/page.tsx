import { PageHeader } from "@/components/PageHeader";
import { RoleBasedLayout } from "@/components/RoleBasedLayout";
import { UserDetailPanel } from "@/components/UserFormClient";
import { WorkspaceUser } from "@/components/UsersClient";
import { apiGetSafe } from "@/lib/server-api";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function SuperAdminUserViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const users = await apiGetSafe<WorkspaceUser[]>("/api/users", []);
  const user = users.data.find((item) => item.id === id);
  if (!user) notFound();

  return (
    <RoleBasedLayout route="/superadmin/admins" permission="admin.edit" crumbs={[{ label: "Super Admin", href: "/superadmin/dashboard" }, { label: "Admins", href: "/superadmin/admins" }, { label: user.email }]}>
      <PageHeader title={user.email} description="Admin account details and workspace scope." actions={<Link className="button" href={`/superadmin/admins/${id}/edit`}>Edit admin</Link>} />
      <UserDetailPanel user={user} />
    </RoleBasedLayout>
  );
}
