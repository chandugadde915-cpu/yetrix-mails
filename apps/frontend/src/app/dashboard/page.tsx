import { AppShell } from "@/components/AppShell";
import { MetricCard } from "@/components/MetricCard";
import { PageHeader } from "@/components/PageHeader";
import { StatusNotice } from "@/components/StatusNotice";
import { WorkspaceFlow } from "@/components/WorkspaceFlow";
import { requirePageSession } from "@/lib/server-api";
import {
  domainHealth,
  usagePercent,
  workspaceProgress,
} from "@/lib/platform-data";
import { getWorkspaceSnapshot } from "@/lib/workspace-server";
import {
  Activity,
  Database,
  Globe2,
  Inbox,
  Plus,
  RefreshCw,
  Route,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await requirePageSession();

  const { domains, mailboxes, status, errors } = await getWorkspaceSnapshot();
  const activeMailboxes = mailboxes.filter((mailbox) => mailbox.status === "active").length;
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
  const workspace = {
    region: "AWS eu-north-1",
    frontendUrl: "www.yetrixtechnologies.com",
    apiUrl: "api.yetrixtechnologies.com",
    mailHost: "mail.yetrixtechnologies.com",
  };
  const progress = workspaceProgress(domains, mailboxes, status);
  const nextStep = progress.steps.find((step) => !step.complete);
  const commandHeading = progress.readyToSendReceive
    ? "Your mail hosting flow is live."
    : nextStep
      ? `Next: ${nextStep.title}`
      : "Mail workspace is preparing.";
  const readiness = [
    {
      label: "Mail engine",
      value: status.mailcow?.connected ? "Connected" : "Needs attention",
      good: Boolean(status.mailcow?.connected),
    },
    {
      label: "DNS",
      value: `${metrics.verifiedDomains}/${metrics.totalDomains || 0} verified`,
      good: metrics.totalDomains > 0 && metrics.verifiedDomains === metrics.totalDomains,
    },
    {
      label: "Users",
      value: `${metrics.activeMailboxes} active mailboxes`,
      good: metrics.activeMailboxes > 0,
    },
  ];

  return (
    <AppShell>
      <PageHeader
        title="Workspace Dashboard"
        description="Manage domains, mailboxes, DNS status, and platform health."
        actions={
          <Link className="button" href="/domains#domain-create">
            <Plus size={18} />
            Add domain
          </Link>
        }
      />
      <StatusNotice errors={errors} />

      <section className="workspace-command-center">
        <div className="command-copy">
          <div className="eyebrow light">
            <Sparkles size={16} />
            Yetrix workspace control tower
          </div>
          <h2>{commandHeading}</h2>
          <p>
            Run the complete production path from here: connect the engine, verify domain DNS,
            provision users, open webmail, and watch operations without exposing Mailcow.
          </p>
          <div className="command-actions">
            <Link className="button" href={nextStep?.href ?? "/webmail"}>
              <Route size={18} />
              {progress.readyToSendReceive ? "Open workspace" : "Continue flow"}
            </Link>
            <Link className="button secondary" href="/operations">
              <ShieldCheck size={18} />
              Operations
            </Link>
          </div>
        </div>

        <div className="mail-route-board" aria-label="Production mail route">
          <div className="route-node">
            <span>Customer DNS</span>
            <strong>{metrics.totalDomains} domains</strong>
          </div>
          <div className="route-line">
            <i />
            <i />
            <i />
          </div>
          <div className="route-node active">
            <span>Yetrix API</span>
            <strong>{status.api?.healthy ? "Healthy" : "Check"}</strong>
          </div>
          <div className="route-line">
            <i />
            <i />
            <i />
          </div>
          <div className="route-node">
            <span>Mail engine</span>
            <strong>{status.mailcow?.connected ? "Online" : "Offline"}</strong>
          </div>
        </div>

        <div className="readiness-stack">
          {readiness.map((item) => (
            <div className="readiness-row" key={item.label}>
              <span className={item.good ? "ready-dot good" : "ready-dot warn"} />
              <div>
                <strong>{item.label}</strong>
                <p>{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

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

      <WorkspaceFlow domains={domains} mailboxes={mailboxes} status={status} />

      <section className="dashboard-layout section">
        <div className="panel">
          <div className="topbar compact">
            <div className="title">
              <h1>Domain Health</h1>
              <p>DNS verification status for customer domains.</p>
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
            <h1>Platform</h1>
            <p>{workspace.region}</p>
          </div>
          <div className="endpoint-list">
            <div>
              <span>Frontend</span>
              <strong>{workspace.frontendUrl}</strong>
            </div>
            <div>
              <span>API</span>
              <strong>{workspace.apiUrl}</strong>
            </div>
            <div>
              <span>Mail host</span>
              <strong>{workspace.mailHost}</strong>
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
          <p>Recent hosted mailboxes from the backend API.</p>
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
