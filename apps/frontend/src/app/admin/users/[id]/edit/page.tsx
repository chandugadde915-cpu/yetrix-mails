import { PageHeader } from "@/components/PageHeader";
import { RoleBasedLayout } from "@/components/RoleBasedLayout";
import { UserFormClient } from "@/components/UserFormClient";
import { WorkspaceUser } from "@/components/UsersClient";
import { apiGetSafe } from "@/lib/server-api";
import { notFound } from "next/navigation";

export default async function AdminUserEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const users = await apiGetSafe<WorkspaceUser[]>("/api/users", []);
  const user = users.data.find((item) => item.id === id);
  if (!user) notFound();

  return (
    <RoleBasedLayout route="/admin/users" permission="user.edit" crumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Users", href: "/admin/users" }, { label: "Edit" }]}>
      <PageHeader title="Edit user" description={user.email} />
      <UserFormClient user={user} returnPath="/admin/users" />
    </RoleBasedLayout>
  );
}
