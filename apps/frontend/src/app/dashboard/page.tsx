import { AppShell } from "@/components/AppShell";
import { apiGet, requireAuthToken } from "@/lib/server-api";
import { Domain, Mailbox } from "@/lib/dummy-data";
import { Activity, Database, Globe2, Inbox, Plus, RefreshCw, Send } from "lucide-react";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  if (!(await requireAuthToken())) {
    redirect("/login");
  }

  const domains = await apiGet<Domain[]>("/api/domains");
  const mailboxes = await apiGet<Mailbox[]>("/api/mailboxes");
  const activeMailboxes = mailboxes.filter((mailbox) => mailbox.status === "active").length;
  const metrics = {
    totalDomains: domains.length,
    verifiedDomains: domains.filter((domain) => domain.status === "active").length,
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

  return (
    <AppShell>
      <div className="topbar">
        <div className="title">
          <h1>Workspace Dashboard</h1>
          <p>Manage domains, mailboxes, DNS status, and platform health.</p>
        </div>
        <button className="button">
          <Plus size={18} />
          Add domain
        </button>
      </div>

      <section className="metric-grid">
        <div className="panel">
          <div className="metric-row">
            <Globe2 size={20} />
            <div className="metric">Verified domains</div>
          </div>
          <div className="value">
            {metrics.verifiedDomains}/{metrics.totalDomains}
          </div>
        </div>
        <div className="panel">
          <div className="metric-row">
            <Inbox size={20} />
            <div className="metric">Active mailboxes</div>
          </div>
          <div className="value">{metrics.activeMailboxes}</div>
        </div>
        <div className="panel">
          <div className="metric-row">
            <Send size={20} />
              <div className="metric">Inactive mailboxes</div>
          </div>
          <div className="value">{metrics.inactiveMailboxes}</div>
        </div>
        <div className="panel">
          <div className="metric-row">
            <Activity size={20} />
            <div className="metric">Delivery rate</div>
          </div>
          <div className="value">{metrics.deliveryRate}</div>
        </div>
      </section>

      <section className="dashboard-layout section">
        <div className="panel">
          <div className="topbar compact">
            <div className="title">
              <h1>Domain Health</h1>
              <p>DNS verification status for customer domains.</p>
            </div>
            <button className="button secondary">
              <RefreshCw size={18} />
              Recheck DNS
            </button>
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
              {domains.map((domain) => (
                <tr key={domain.domain}>
                  <td>{domain.domain}</td>
                  <td>
                    <span className={`badge ${domain.status === "active" ? "good" : "warn"}`}>
                    {domain.status === "active" ? "Verified" : "Pending"}
                    </span>
                  </td>
                  <td>{domain.mailboxes}</td>
                  <td>{domain.health}</td>
                </tr>
              ))}
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
                <span style={{ width: `${(metrics.storageUsedGb / metrics.storageLimitGb) * 100}%` }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="panel section">
        <div className="title">
          <h1>Recent Mailboxes</h1>
          <p>Recent Mailcow mailboxes from the backend API.</p>
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
          </tbody>
        </table>
      </section>
    </AppShell>
  );
}
