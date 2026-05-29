import { PageHeader } from "@/components/PageHeader";
import { RoleBasedLayout } from "@/components/RoleBasedLayout";
import { UserFormClient } from "@/components/UserFormClient";

export default function CreateSuperAdminUserPage() {
  return (
    <RoleBasedLayout route="/superadmin/admins/create" permission="admin.create" crumbs={[{ label: "Super Admin", href: "/superadmin/dashboard" }, { label: "Admins", href: "/superadmin/admins" }, { label: "Create" }]}>
      <PageHeader title="Create admin" description="Add a platform or workspace admin account." />
      <UserFormClient returnPath="/superadmin/admins" canCreateSuperadmin />
    </RoleBasedLayout>
  );
}
