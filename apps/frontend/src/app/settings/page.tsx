import { AppShell } from "@/components/AppShell";
import { UsersClient, WorkspaceUser } from "@/components/UsersClient";
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
  const workspace = await apiGet<{
    id: string;
    name: string;
    status: string;
    counts: { domains: number; mailboxes: number; aliases: number; users: number };
  }>("/api/workspace");
  const users = await apiGet<WorkspaceUser[]>("/api/users");
  const audit = await apiGet<Array<{ id: string; action: string; target: string; createdAt: string }>>(
    "/api/audit",
  );
  const settings = {
    security: [
      { label: "Backend bearer-token authentication", enabled: true },
      { label: "Mail engine key backend-only", enabled: true },
      { label: "Restricted CORS origin", enabled: true },
      { label: "Workspace-scoped domain and mailbox access", enabled: true },
    ],
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
              <span>Mail engine</span>
              <strong>{status.mailcow.connected ? "Connected" : "Disconnected"}</strong>
            </div>
            <div>
              <span>Engine access</span>
              <strong>Backend only</strong>
            </div>
            {status.mailcow.error ? (
              <div>
                <span>Last error</span>
                <strong>{status.mailcow.error}</strong>
              </div>
            ) : null}
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
              <span>Domains</span>
              <strong>{workspace.counts.domains}</strong>
            </div>
            <div>
              <span>Users</span>
              <strong>{workspace.counts.users}</strong>
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
          <h1>Workspace Users</h1>
          <p>Create tenant admins, support users, and viewers for this workspace.</p>
        </div>
        <UsersClient initialUsers={users} />
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
            {audit.length === 0 ? (
              <tr>
                <td colSpan={3}>No admin actions recorded yet.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </AppShell>
  );
}
