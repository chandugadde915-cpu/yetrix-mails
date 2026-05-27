import { AppShell } from "@/components/AppShell";
import { getDummyData } from "@/lib/dummy-data";
import { Activity, Database, Globe2, Inbox, Plus, RefreshCw, Send } from "lucide-react";

export default function DashboardPage() {
  const { domains, mailboxes, metrics, workspace } = getDummyData();

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
            <div className="metric">Outbound queue</div>
          </div>
          <div className="value">{metrics.outboundQueue}</div>
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
                      {domain.status === "active" ? "Verified" : "Pending DNS"}
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
          <p>Sample workspace users loaded from dummy JSON.</p>
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
                <td>{mailbox.lastLogin}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </AppShell>
  );
}
