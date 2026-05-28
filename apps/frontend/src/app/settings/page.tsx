import { AppShell } from "@/components/AppShell";
import { apiGet } from "@/lib/api";
import { getDummyData } from "@/lib/dummy-data";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { settings, workspace } = getDummyData();
  const health = await apiGet("/health", {
    status: "offline",
    service: "yetrix-api",
    timestamp: null as string | null,
  });
  const status = await apiGet("/api/status", {
    api: { healthy: false, timestamp: null as string | null },
    mailcow: { connected: false, mailcowBaseUrl: workspace.mailHost, error: "Not connected" },
  });

  return (
    <AppShell>
      <div className="title">
        <h1>Settings</h1>
        <p>Workspace identity, security defaults, and admin controls.</p>
      </div>
      <section className="settings-grid section">
        <div className="panel">
          <h2>API Status</h2>
          <div className="endpoint-list">
            <div>
              <span>Backend API</span>
              <strong>{health.status === "ok" ? "Online" : "Offline"}</strong>
            </div>
            <div>
              <span>Mailcow</span>
              <strong>{status.mailcow.connected ? "Connected" : "Disconnected"}</strong>
            </div>
            <div>
              <span>Mailcow URL</span>
              <strong>{status.mailcow.mailcowBaseUrl}</strong>
            </div>
          </div>
        </div>

        <div className="panel">
          <h2>Workspace</h2>
          <div className="endpoint-list">
            <div>
              <span>Name</span>
              <strong>{workspace.name}</strong>
            </div>
            <div>
              <span>Primary domain</span>
              <strong>{workspace.primaryDomain}</strong>
            </div>
            <div>
              <span>Region</span>
              <strong>{workspace.region}</strong>
            </div>
          </div>
        </div>

        <div className="panel">
          <h2>Security defaults</h2>
          <div className="toggle-list">
            {settings.security.map((item) => (
              <div className="toggle-row" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.enabled ? "On" : "Off"}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="panel section">
        <div className="title">
          <h1>Admins</h1>
          <p>Workspace access shown from dummy JSON.</p>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            {settings.admins.map((admin) => (
              <tr key={admin.email}>
                <td>{admin.name}</td>
                <td>{admin.email}</td>
                <td>{admin.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel section">
        <div className="title">
          <h1>Service Endpoints</h1>
          <p>Use these values when backend and mail services are connected.</p>
        </div>
        <div className="records">
          <div className="record">
            <strong>API</strong>
            <span className="mono">{workspace.apiUrl}</span>
          </div>
          <div className="record">
            <strong>SMTP</strong>
            <span className="mono">{workspace.mailHost}:587</span>
          </div>
          <div className="record">
            <strong>IMAP</strong>
            <span className="mono">{workspace.mailHost}:993</span>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
