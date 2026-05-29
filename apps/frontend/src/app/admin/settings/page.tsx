import { HealthBadge } from "@/components/StatusBadge";
import { PageHeader } from "@/components/PageHeader";
import { RoleBasedLayout } from "@/components/RoleBasedLayout";
import { PlatformStatus } from "@/lib/platform-data";
import { apiGetSafe } from "@/lib/server-api";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const [workspace, status] = await Promise.all([
    apiGetSafe<{ name?: string; status?: string; counts?: { users?: number; domains?: number; mailboxes?: number } } | null>("/api/workspace", null),
    apiGetSafe<PlatformStatus>("/api/status", {}),
  ]);

  return (
    <RoleBasedLayout route="/admin/settings" permission="workspace.edit" crumbs={[{ label: "Admin" }, { label: "Settings" }]}>
      <PageHeader title="Workspace Settings" description="Workspace identity, protected access, and service health." />
      <section className="settings-grid section">
        <div className="panel">
          <h2>Workspace</h2>
          <div className="endpoint-list">
            <div><span>Name</span><strong>{workspace.data?.name ?? "Workspace"}</strong></div>
            <div><span>Status</span><strong>{workspace.data?.status ?? "active"}</strong></div>
            <div><span>Users</span><strong>{workspace.data?.counts?.users ?? 0}</strong></div>
            <div><span>Domains</span><strong>{workspace.data?.counts?.domains ?? 0}</strong></div>
          </div>
        </div>
        <div className="panel">
          <h2>Live health</h2>
          <div className="health-strip vertical">
            <HealthBadge label="Mailcow connected" connected={status.data.mailcow?.connected} />
            <HealthBadge label="IMAP OK" connected={status.data.mailcow?.connected} />
            <HealthBadge label="SMTP OK" connected={status.data.smtp?.connected} />
          </div>
        </div>
      </section>
    </RoleBasedLayout>
  );
}
