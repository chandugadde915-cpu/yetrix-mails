import { PageHeader } from "@/components/PageHeader";
import { RoleBasedLayout } from "@/components/RoleBasedLayout";
import { UserTableClient } from "@/components/UserTableClient";
import { WorkspaceUser } from "@/components/UsersClient";
import { apiGetSafe } from "@/lib/server-api";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const [users, profile] = await Promise.all([
    apiGetSafe<WorkspaceUser[]>("/api/users", []),
    apiGetSafe<{ role?: string } | null>("/api/me", null),
  ]);

  return (
    <RoleBasedLayout route="/admin/users" permission="user.view" crumbs={[{ label: "Admin" }, { label: "Users" }]}>
      <PageHeader title="Users" description="Workspace admins, support users, and mailbox-facing users." />
      <UserTableClient users={users.data} basePath="/admin/users" currentRole={profile.data?.role} />
    </RoleBasedLayout>
  );
}
