import { HealthBadge } from "@/components/StatusBadge";
import { PageHeader } from "@/components/PageHeader";
import { RoleBasedLayout } from "@/components/RoleBasedLayout";
import { PlatformStatus } from "@/lib/platform-data";
import { apiGetSafe } from "@/lib/server-api";

export const dynamic = "force-dynamic";

export default async function SystemSettingsPage() {
  const status = await apiGetSafe<PlatformStatus>("/api/status", {});

  return (
    <RoleBasedLayout route="/superadmin/system-settings" permission="system.manage" crumbs={[{ label: "Super Admin" }, { label: "System Settings" }]}>
      <PageHeader title="System Settings" description="Safe platform status. Secrets and internal credentials are never exposed." />
      <section className="settings-grid section">
        <div className="panel">
          <h2>Live health</h2>
          <div className="endpoint-list">
            <div><span>Control API</span><strong>{status.data.api?.healthy ? "Online" : "Offline"}</strong></div>
            <div><span>Mailcow</span><strong>{status.data.mailcow?.connected ? "Connected" : "Disconnected"}</strong></div>
            <div><span>SMTP</span><strong>{status.data.smtp?.connected ? "Connected" : "Sending unavailable"}</strong></div>
          </div>
        </div>
        <div className="panel">
          <h2>Badges</h2>
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
