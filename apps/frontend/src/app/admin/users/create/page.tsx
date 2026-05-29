import { PageHeader } from "@/components/PageHeader";
import { RoleBasedLayout } from "@/components/RoleBasedLayout";
import { UserFormClient } from "@/components/UserFormClient";

export default function AdminUserCreatePage() {
  return (
    <RoleBasedLayout route="/admin/users/create" permission="user.create" crumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Users", href: "/admin/users" }, { label: "Create" }]}>
      <PageHeader title="Create user" description="Invite a workspace admin, support user, or mail user." />
      <UserFormClient returnPath="/admin/users" />
    </RoleBasedLayout>
  );
}
