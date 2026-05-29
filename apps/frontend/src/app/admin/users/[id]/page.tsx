import { PageHeader } from "@/components/PageHeader";
import { RoleBasedLayout } from "@/components/RoleBasedLayout";
import { UserDetailPanel } from "@/components/UserFormClient";
import { WorkspaceUser } from "@/components/UsersClient";
import { apiGetSafe } from "@/lib/server-api";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function AdminUserViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const users = await apiGetSafe<WorkspaceUser[]>("/api/users", []);
  const user = users.data.find((item) => item.id === id);
  if (!user) notFound();

  return (
    <RoleBasedLayout route="/admin/users" permission="user.view" crumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Users", href: "/admin/users" }, { label: user.email }]}>
      <PageHeader title={user.email} description="Workspace user profile and role." actions={<Link className="button" href={`/admin/users/${id}/edit`}>Edit user</Link>} />
      <UserDetailPanel user={user} />
    </RoleBasedLayout>
  );
}
