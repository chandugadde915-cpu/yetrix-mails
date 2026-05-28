import { AppShell } from "@/components/AppShell";
import { apiGet, requireAuthToken } from "@/lib/server-api";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  if (!(await requireAuthToken())) {
    redirect("/login");
  }

  const health = await apiGet<{
    status: string;
    service: string;
    timestamp: string;
  }>("/health");
  const status = await apiGet<{
    api: { healthy: boolean; timestamp: string };
    mailcow: { connected: boolean; mailcowBaseUrl: string; error?: string };
  }>("/api/status");
  const audit = await apiGet<Array<{ id: string; action: string; target: string; createdAt: string }>>(
    "/api/audit",
  );
  const settings = {
    security: [
      { label: "Backend bearer-token authentication", enabled: true },
      { label: "Mailcow API key backend-only", enabled: true },
      { label: "Restricted CORS origin", enabled: true },
      { label: "Audit log for mailbox/domain actions", enabled: true },
    ],
    admins: [{ name: "Admin", email: "admin@yetrixtechnologies.com", role: "Owner" }],
  };
  const workspace = {
    name: "Yetrix Mails",
    primaryDomain: "yetrixtechnologies.com",
    region: "AWS eu-north-1",
    apiUrl: "api.yetrixtechnologies.com",
    mailHost: "mail.yetrixtechnologies.com",
  };

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
          <p>Configured backend admin access for the control panel.</p>
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
          <h1>Audit Log</h1>
          <p>Recent control-panel actions recorded by the backend.</p>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Action</th>
              <th>Target</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {audit.map((event) => (
              <tr key={event.id}>
                <td>{event.action}</td>
                <td>{event.target}</td>
                <td>{event.createdAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </AppShell>
  );
}
