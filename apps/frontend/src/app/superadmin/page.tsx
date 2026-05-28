import { AppShell } from "@/components/AppShell";
import { MetricCard } from "@/components/MetricCard";
import { PageHeader } from "@/components/PageHeader";
import { StatusNotice } from "@/components/StatusNotice";
import type { AliasRow } from "@/components/AliasesClient";
import type { WorkspaceUser } from "@/components/UsersClient";
import type { Domain, Mailbox } from "@/lib/platform-data";
import { domainHealth } from "@/lib/platform-data";
import { apiGetSafe, requirePageSession } from "@/lib/server-api";
import { AtSign, Building2, Crown, Globe2, Inbox, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface WorkspaceInventory {
  id: string;
  name: string;
  status: string;
  created_at?: string;
  counts: {
    domains: number;
    mailboxes: number;
    aliases: number;
    users: number;
  };
}

export default async function SuperadminPage() {
  await requirePageSession();

  const [workspaces, users, domains, mailboxes, aliases] = await Promise.all([
    apiGetSafe<WorkspaceInventory[]>("/api/workspaces", []),
    apiGetSafe<WorkspaceUser[]>("/api/users", []),
    apiGetSafe<Domain[]>("/api/domains", []),
    apiGetSafe<Mailbox[]>("/api/mailboxes", []),
    apiGetSafe<AliasRow[]>("/api/aliases", []),
  ]);
  const accessDenied = workspaces.status === 403;
  const errors = [
    accessDenied ? undefined : workspaces.error,
    users.error,
    domains.error,
    mailboxes.error,
    aliases.error,
  ].filter(Boolean) as string[];
  const activeWorkspaces = workspaces.data.filter((workspace) => workspace.status === "active").length;
  const verifiedDomains = domains.data.filter((domain) => domainHealth(domain).healthy).length;
  const activeMailboxes = mailboxes.data.filter((mailbox) => mailbox.status === "active").length;
  const activeAliases = aliases.data.filter((alias) => alias.status === "active").length;

  if (accessDenied) {
    return (
      <AppShell>
        <PageHeader
          title="Superadmin"
          description="Platform owner access for all workspaces and hosted mail data."
        />
        <section className="workspace-missing">
          <Crown size={26} />
          <h1>Superadmin access required</h1>
          <p>
            Your current session can manage its own workspace. Sign in with the platform owner
            account to view all admins, users, domains, mailboxes, aliases, and workspace totals.
          </p>
          <Link className="button" href="/login">
            Sign in as superadmin
          </Link>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title="Superadmin"
        description="Global control plane for workspaces, customer domains, hosted users, and mail routes."
        actions={
          <Link className="button" href="/settings">
            <ShieldCheck size={18} />
            Security settings
          </Link>
        }
      />
      <StatusNotice errors={errors} message="Some platform data is temporarily unavailable." />

      <section className="superadmin-hero">
        <div>
          <div className="eyebrow light">
            <Crown size={16} />
            Platform owner console
          </div>
          <h2>Every workspace and mail route from one control panel.</h2>
          <p>
            Review tenant health, admin coverage, domain readiness, mailbox activity, and alias
            routing from the Yetrix owner console.
          </p>
        </div>
        <div className="superadmin-signal">
          <div>
            <span>Scope</span>
            <strong>All tenants</strong>
          </div>
          <div>
            <span>Access</span>
            <strong>Protected</strong>
          </div>
          <div>
            <span>Admin role</span>
            <strong>Superadmin</strong>
          </div>
        </div>
      </section>

      <section className="metric-grid">
        <MetricCard icon={Building2} label="Active workspaces" value={`${activeWorkspaces}/${workspaces.data.length}`} />
        <MetricCard icon={Users} label="Users" value={users.data.length} />
        <MetricCard icon={Globe2} label="Verified domains" value={`${verifiedDomains}/${domains.data.length}`} />
        <MetricCard icon={Inbox} label="Active mailboxes" value={`${activeMailboxes}/${mailboxes.data.length}`} />
      </section>

      <section className="superadmin-layout section">
        <div className="panel">
          <div className="split-row">
            <div className="title">
              <h1>Workspaces</h1>
              <p>Tenant inventory across the platform.</p>
            </div>
            <span className="badge good">{workspaces.data.length} total</span>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Workspace</th>
                <th>Status</th>
                <th>Domains</th>
                <th>Mailboxes</th>
                <th>Aliases</th>
                <th>Users</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {workspaces.data.map((workspace) => (
                <tr key={workspace.id}>
                  <td>{workspace.name}</td>
                  <td>
                    <span className={`badge ${workspace.status === "active" ? "good" : "warn"}`}>
                      {workspace.status}
                    </span>
                  </td>
                  <td>{workspace.counts.domains}</td>
                  <td>{workspace.counts.mailboxes}</td>
                  <td>{workspace.counts.aliases}</td>
                  <td>{workspace.counts.users}</td>
                  <td>{formatDate(workspace.created_at)}</td>
                </tr>
              ))}
              {workspaces.data.length === 0 ? (
                <tr>
                  <td colSpan={7}>No workspaces found.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="panel">
          <div className="title">
            <h1>Admin Coverage</h1>
            <p>Users and roles across every tenant.</p>
          </div>
          <div className="admin-list">
            {users.data.slice(0, 10).map((user) => (
              <div className="admin-row" key={user.id}>
                <span className="admin-avatar">{initials(user.name ?? user.email)}</span>
                <span>
                  <strong>{user.name ?? user.email}</strong>
                  <small>{user.workspace_name ?? "Workspace"} - {user.role}</small>
                </span>
                <span className={`badge ${user.status === "active" ? "good" : "warn"}`}>
                  {user.status}
                </span>
              </div>
            ))}
            {users.data.length === 0 ? <div className="muted-text">No users found.</div> : null}
          </div>
        </div>
      </section>

      <section className="superadmin-layout section">
        <div className="panel">
          <div className="title">
            <h1>Domain Readiness</h1>
            <p>Live domain health across customer workspaces.</p>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Domain</th>
                <th>Status</th>
                <th>DNS</th>
                <th>Mailboxes</th>
              </tr>
            </thead>
            <tbody>
              {domains.data.slice(0, 8).map((domain) => {
                const health = domainHealth(domain);
                return (
                  <tr key={domain.domain}>
                    <td>{domain.domain}</td>
                    <td>
                      <span className={`badge ${health.healthy ? "good" : "warn"}`}>
                        {health.healthy ? "Verified" : "Pending"}
                      </span>
                    </td>
                    <td>{health.label}</td>
                    <td>{domain.mailboxes ?? 0}</td>
                  </tr>
                );
              })}
              {domains.data.length === 0 ? (
                <tr>
                  <td colSpan={4}>No domains found.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="panel">
          <div className="title">
            <h1>Mail Inventory</h1>
            <p>Mailbox and alias activity across the platform.</p>
          </div>
          <div className="mail-inventory">
            <div>
              <Inbox size={20} />
              <span>Mailboxes</span>
              <strong>{mailboxes.data.length}</strong>
              <small>{activeMailboxes} active</small>
            </div>
            <div>
              <AtSign size={20} />
              <span>Aliases</span>
              <strong>{aliases.data.length}</strong>
              <small>{activeAliases} active</small>
            </div>
          </div>
          <div className="endpoint-list">
            {mailboxes.data.slice(0, 4).map((mailbox) => (
              <div key={mailbox.address}>
                <span>{mailbox.domain}</span>
                <strong>{mailbox.address}</strong>
              </div>
            ))}
            {mailboxes.data.length === 0 ? (
              <div>
                <span>Status</span>
                <strong>No mailbox data</strong>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </AppShell>
  );
}

function formatDate(value?: string) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function initials(value: string) {
  return value
    .split(/[ @.]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
