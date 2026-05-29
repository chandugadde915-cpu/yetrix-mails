import { PageHeader } from "@/components/PageHeader";
import { RoleBasedLayout } from "@/components/RoleBasedLayout";
import { UserTableClient } from "@/components/UserTableClient";
import { WorkspaceUser } from "@/components/UsersClient";
import { apiGetSafe } from "@/lib/server-api";

export const dynamic = "force-dynamic";

export default async function SuperAdminAdminsPage() {
  const users = await apiGetSafe<WorkspaceUser[]>("/api/users", []);

  return (
    <RoleBasedLayout route="/superadmin/admins" permission="admin.edit" crumbs={[{ label: "Super Admin" }, { label: "Admins" }]}>
      <PageHeader title="Admins" description="Create, edit, disable, and delete admins across workspaces." />
      <UserTableClient users={users.data} basePath="/superadmin/admins" currentRole="superadmin" adminsOnly />
    </RoleBasedLayout>
  );
}
