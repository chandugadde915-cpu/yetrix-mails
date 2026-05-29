import { HealthBadge } from "@/components/StatusBadge";
import { MetricCard } from "@/components/MetricCard";
import { PageHeader } from "@/components/PageHeader";
import { RoleBasedLayout } from "@/components/RoleBasedLayout";
import { StatusNotice } from "@/components/StatusNotice";
import { WorkspaceUser } from "@/components/UsersClient";
import type { Domain, Mailbox, PlatformStatus } from "@/lib/platform-data";
import { domainHealth, formatDateTime } from "@/lib/platform-data";
import { apiGetSafe } from "@/lib/server-api";
import { Building2, Globe2, Inbox, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface WorkspaceInventory {
  id: string;
  name: string;
  status: string;
  created_at?: string;
  counts: { domains: number; mailboxes: number; aliases: number; users: number };
}

interface AuditRow {
  id: string;
  action: string;
  target: string;
  actor?: string;
  createdAt: string;
}

export default async function SuperAdminDashboardPage() {
  const [workspaces, users, domains, mailboxes, audit, status] = await Promise.all([
    apiGetSafe<WorkspaceInventory[]>("/api/workspaces", []),
    apiGetSafe<WorkspaceUser[]>("/api/users", []),
    apiGetSafe<Domain[]>("/api/domains", []),
    apiGetSafe<Mailbox[]>("/api/mailboxes", []),
    apiGetSafe<AuditRow[]>("/api/audit", []),
    apiGetSafe<PlatformStatus>("/api/status", {}),
  ]);
  const activeWorkspaces = workspaces.data.filter((workspace) => workspace.status === "active").length;
  const adminCount = users.data.filter((user) => ["superadmin", "owner", "admin", "support"].includes(user.role)).length;
  const userCount = users.data.filter((user) => !["superadmin", "owner", "admin", "support"].includes(user.role)).length;
  const verifiedDomains = domains.data.filter((domain) => domainHealth(domain).healthy).length;

  return (
    <RoleBasedLayout
      route="/superadmin/dashboard"
      permission="workspace.view"
      crumbs={[{ label: "Super Admin" }, { label: "Dashboard" }]}
    >
      <PageHeader
        title="Super Admin Dashboard"
        description="Global view of all workspaces, admins, domains, mailboxes, and system health."
        actions={<Link className="button" href="/superadmin/admins/create">Create admin</Link>}
      />
      <StatusNotice errors={[workspaces.error, users.error, domains.error, mailboxes.error, audit.error, status.error]} />
      <section className="health-strip">
        <HealthBadge label="Mailcow" connected={status.data.mailcow?.connected} />
        <HealthBadge label="SMTP" connected={status.data.smtp?.connected} />
        <HealthBadge label="API" connected={status.data.api?.healthy} />
      </section>
      <section className="metric-grid">
        <MetricCard icon={Building2} label="Total workspaces" value={`${activeWorkspaces}/${workspaces.data.length}`} />
        <MetricCard icon={ShieldCheck} label="Total admins" value={adminCount} />
        <MetricCard icon={Users} label="Total users" value={userCount} />
        <MetricCard icon={Globe2} label="Total domains" value={`${verifiedDomains}/${domains.data.length}`} />
        <MetricCard icon={Inbox} label="Total mailboxes" value={mailboxes.data.length} />
      </section>
      <section className="panel section">
        <div className="split-row">
          <div className="title">
            <h1>Recent audit logs</h1>
            <p>Latest platform actions across all workspaces.</p>
          </div>
          <Link className="button secondary" href="/superadmin/audit-logs">View all</Link>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Action</th>
              <th>Target</th>
              <th>Actor</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {audit.data.slice(0, 8).map((event) => (
              <tr key={event.id}>
                <td>{event.action}</td>
                <td>{event.target}</td>
                <td>{event.actor ?? "system"}</td>
                <td>{formatDateTime(event.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </RoleBasedLayout>
  );
}
