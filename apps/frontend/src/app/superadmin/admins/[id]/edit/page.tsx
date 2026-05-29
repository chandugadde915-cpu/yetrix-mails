import { PageHeader } from "@/components/PageHeader";
import { RoleBasedLayout } from "@/components/RoleBasedLayout";
import { UserFormClient } from "@/components/UserFormClient";
import { WorkspaceUser } from "@/components/UsersClient";
import { apiGetSafe } from "@/lib/server-api";
import { notFound } from "next/navigation";

export default async function SuperAdminUserEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const users = await apiGetSafe<WorkspaceUser[]>("/api/users", []);
  const user = users.data.find((item) => item.id === id);
  if (!user) notFound();

  return (
    <RoleBasedLayout route="/superadmin/admins" permission="admin.edit" crumbs={[{ label: "Super Admin", href: "/superadmin/dashboard" }, { label: "Admins", href: "/superadmin/admins" }, { label: "Edit" }]}>
      <PageHeader title="Edit admin" description={user.email} />
      <UserFormClient user={user} returnPath="/superadmin/admins" canCreateSuperadmin />
    </RoleBasedLayout>
  );
}
