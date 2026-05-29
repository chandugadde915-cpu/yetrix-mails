import { PageHeader } from "@/components/PageHeader";
import { RoleBasedLayout } from "@/components/RoleBasedLayout";
import { rolePermissions } from "@/lib/authz";

export const dynamic = "force-dynamic";

export default function PermissionsPage() {
  return (
    <RoleBasedLayout route="/superadmin/permissions" permission="permission.manage" crumbs={[{ label: "Super Admin" }, { label: "Permissions" }]}>
      <PageHeader title="Permissions" description="Role-to-permission map used by the control panel." />
      <section className="permission-grid section">
        {Object.entries(rolePermissions).map(([role, permissions]) => (
          <article className="panel" key={role}>
            <div className="title">
              <h1>{role}</h1>
              <p>{permissions.length} permissions</p>
            </div>
            <div className="permission-list">
              {permissions.map((permission) => (
                <span className="badge neutral" key={permission}>
                  {permission}
                </span>
              ))}
            </div>
          </article>
        ))}
      </section>
    </RoleBasedLayout>
  );
}
