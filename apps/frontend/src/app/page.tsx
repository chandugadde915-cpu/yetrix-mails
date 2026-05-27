import { AppShell } from "@/components/AppShell";
import { apiGet } from "@/lib/api";
import { Plus, RefreshCw } from "lucide-react";

const fallbackDomains = [
  { domain: "company.com", status: "pending_dns", createdAt: new Date().toISOString() },
];

export default async function DashboardPage() {
  const domains = await apiGet("/domains", fallbackDomains);
  const verifiedDomains = domains.filter((domain) => domain.status === "active").length;

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

      <section className="grid">
        <div className="panel">
          <div className="metric">Verified domains</div>
          <div className="value">{verifiedDomains}</div>
        </div>
        <div className="panel">
          <div className="metric">Active mailboxes</div>
          <div className="value">0</div>
        </div>
        <div className="panel">
          <div className="metric">Outbound queue</div>
          <div className="value">0</div>
        </div>
      </section>

      <section className="panel section">
        <div className="topbar">
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
                <td>0</td>
                <td>{domain.status === "active" ? "Good" : "Needs records"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </AppShell>
  );
}
