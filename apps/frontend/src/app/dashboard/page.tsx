import { AppShell } from "@/components/AppShell";
import { MetricCard } from "@/components/MetricCard";
import { PageHeader } from "@/components/PageHeader";
import { StatusNotice } from "@/components/StatusNotice";
import { apiGetSafe, requirePageSession } from "@/lib/server-api";
import { domainHealth, usagePercent } from "@/lib/platform-data";
import { getWorkspaceSnapshot } from "@/lib/workspace-server";
import {
  Activity,
  Building2,
  Database,
  Globe2,
  Inbox,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  UserCircle2,
  Users,
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface ProfileUser {
  id: string;
  email: string;
  username?: string | null;
  name?: string | null;
  role: string;
  status: string;
  workspace_id?: string;
  workspace_name?: string;
  created_at?: string | null;
}

interface WorkspaceSummary {
  id: string;
  name: string;
  status: string;
  counts: { workspaces?: number; domains: number; mailboxes: number; aliases: number; users: number };
}

export default async function DashboardPage() {
  await requirePageSession();

  const [snapshot, profile, workspace] = await Promise.all([
    getWorkspaceSnapshot(),
    apiGetSafe<ProfileUser | null>("/api/me", null),
    apiGetSafe<WorkspaceSummary | null>("/api/workspace", null),
  ]);
  const { domains, mailboxes, errors } = snapshot;
  const loadErrors = [...errors, profile.error, workspace.error].filter(Boolean) as string[];
  const activeMailboxes = mailboxes.filter((mailbox) => mailbox.status === "active").length;
  const profileName = profile.data?.name || profile.data?.username || profile.data?.email || "Admin user";
  const workspaceName = workspace.data?.name || profile.data?.workspace_name || "Yetrix Workspace";
  const metrics = {
    totalDomains: domains.length,
    verifiedDomains: domains.filter((domain) => domainHealth(domain).healthy).length,
    activeMailboxes,
    inactiveMailboxes: mailboxes.length - activeMailboxes,
    outboundQueue: 0,
    deliveryRate: "Live",
    storageUsedGb: Math.round(
      mailboxes.reduce((total, mailbox) => total + (mailbox.usedMb ?? 0), 0) / 1024,
    ),
    storageLimitGb: Math.round(
      mailboxes.reduce((total, mailbox) => total + (mailbox.quotaMb ?? 0), 0) / 1024,
    ),
  };
  return (
    <AppShell>
      <PageHeader
        title="Workspace Dashboard"
        description="Manage domains, mailboxes, DNS readiness, and workspace health."
        actions={
          <Link className="button" href="/domains#domain-create">
            <Plus size={18} />
            Add domain
          </Link>
        }
      />
      <StatusNotice errors={loadErrors} />

      <section className="metric-grid">
        <MetricCard
          icon={Globe2}
          label="Verified domains"
          value={`${metrics.verifiedDomains}/${metrics.totalDomains}`}
        />
        <MetricCard icon={Inbox} label="Active mailboxes" value={metrics.activeMailboxes} />
        <MetricCard icon={Send} label="Inactive mailboxes" value={metrics.inactiveMailboxes} />
        <MetricCard icon={Activity} label="Delivery rate" value={metrics.deliveryRate} />
      </section>

      <section className="dashboard-profile section">
        <div className="profile-card">
          <div className="profile-avatar">{initials(profileName)}</div>
          <div>
            <div className="eyebrow light">
              <UserCircle2 size={16} />
              Signed in profile
            </div>
            <h2>{profileName}</h2>
            <p>{profile.data?.email ?? "Profile data unavailable"}</p>
            <div className="profile-actions">
              <span className="badge good">{formatRole(profile.data?.role ?? "admin")}</span>
              <span className={`badge ${profile.data?.status === "active" ? "good" : "warn"}`}>
                {profile.data?.status ?? "active"}
              </span>
            </div>
          </div>
        </div>
        <div className="profile-summary">
          <div>
            <Building2 size={18} />
            <span>Workspace</span>
            <strong>{workspaceName}</strong>
          </div>
          <div>
            <ShieldCheck size={18} />
            <span>Access</span>
            <strong>{formatRole(profile.data?.role ?? "admin")}</strong>
          </div>
          <div>
            <Users size={18} />
            <span>Team users</span>
            <strong>{workspace.data?.counts.users ?? 1}</strong>
          </div>
        </div>
        <div className="profile-quick-actions">
          <Link className="button secondary" href="/settings">
            Account settings
          </Link>
          <Link className="button secondary" href="/admin">
            Admin console
          </Link>
        </div>
      </section>

      <section className="dashboard-layout section">
        <div className="panel">
          <div className="topbar compact">
            <div className="title">
              <h1>Domain Health</h1>
              <p>Verification status for customer domains.</p>
            </div>
            <Link className="button secondary" href="/domains">
              <RefreshCw size={18} />
              Recheck DNS
            </Link>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Domain</th>
                <th>Status</th>
                <th>Mailboxes</th>
                <th>Health</th>
              </tr>
            </thead>
            <tbody>
              {domains.map((domain) => {
                const health = domainHealth(domain);
                return (
                  <tr key={domain.domain}>
                    <td>{domain.domain}</td>
                    <td>
                      <span className={`badge ${health.healthy ? "good" : "warn"}`}>
                        {health.healthy ? "Verified" : "Pending"}
                      </span>
                    </td>
                    <td>{domain.mailboxes ?? 0}</td>
                    <td>{health.label}</td>
                  </tr>
                );
              })}
              {domains.length === 0 ? (
                <tr>
                  <td colSpan={4}>No domains yet. Add your first domain to begin DNS setup.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="panel">
          <div className="title">
            <h1>Workspace Capacity</h1>
            <p>Storage and mailbox readiness for this account.</p>
          </div>
          <div className="endpoint-list">
            <div>
              <span>Domains ready</span>
              <strong>{metrics.verifiedDomains}</strong>
            </div>
            <div>
              <span>Mailbox users</span>
              <strong>{mailboxes.length}</strong>
            </div>
            <div>
              <span>Delivery status</span>
              <strong>{metrics.deliveryRate}</strong>
            </div>
          </div>
          <div className="storage-box">
            <Database size={20} />
            <div>
              <strong>
                {metrics.storageUsedGb} GB / {metrics.storageLimitGb} GB
              </strong>
              <div className="progress">
                <span style={{ width: `${usagePercent(metrics.storageUsedGb, metrics.storageLimitGb)}%` }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="panel section">
        <div className="title">
          <h1>Recent Mailboxes</h1>
          <p>Recent mailbox activity for this workspace.</p>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Domain</th>
              <th>Status</th>
              <th>Last login</th>
            </tr>
          </thead>
          <tbody>
            {mailboxes.slice(0, 4).map((mailbox) => (
              <tr key={mailbox.address}>
                <td>{mailbox.address}</td>
                <td>{mailbox.domain}</td>
                <td>
                  <span className={`badge ${mailbox.status === "active" ? "good" : "warn"}`}>
                    {mailbox.status}
                  </span>
                </td>
                <td>{String(mailbox.lastLogin ?? "Not available")}</td>
              </tr>
            ))}
            {mailboxes.length === 0 ? (
              <tr>
                <td colSpan={4}>No mailboxes yet. Create an address from the Mailboxes page.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </AppShell>
  );
}

function initials(value: string) {
  return value
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatRole(role: string) {
  if (role === "owner") return "Admin";
  return role
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}
