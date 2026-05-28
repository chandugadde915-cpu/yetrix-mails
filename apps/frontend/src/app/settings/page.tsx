import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { StatusNotice } from "@/components/StatusNotice";
import { UsersClient, WorkspaceUser } from "@/components/UsersClient";
import { WorkspaceSyncButton } from "@/components/WorkspaceSyncButton";
import { apiGetSafe, requirePageSession } from "@/lib/server-api";

export const dynamic = "force-dynamic";

interface WorkspaceSummary {
  id: string;
  name: string;
  status: string;
  counts: { workspaces?: number; domains: number; mailboxes: number; aliases: number; users: number };
}

export default async function SettingsPage() {
  await requirePageSession();

  const [health, status, workspace, users, audit] = await Promise.all([
    apiGetSafe<{ status: string; service: string; timestamp: string }>("/health", {
      status: "offline",
      service: "ownmail-api",
      timestamp: "",
    }),
    apiGetSafe<{
      api: { healthy: boolean; timestamp?: string };
      mailcow: { connected: boolean; mailcowBaseUrl?: string; error?: string };
    }>("/api/status", {
      api: { healthy: false },
      mailcow: { connected: false },
    }),
    apiGetSafe<WorkspaceSummary | null>("/api/workspace", null),
    apiGetSafe<WorkspaceUser[]>("/api/users", []),
    apiGetSafe<Array<{ id: string; action: string; target: string; createdAt: string }>>(
      "/api/audit",
      [],
    ),
  ]);
  const loadErrors = [
    health.error,
    status.error,
    workspace.error,
    users.error,
    audit.error,
  ].filter(Boolean);
  const settings = {
    security: [
      { label: "Secure admin sessions", enabled: true },
      { label: "Protected mail controls", enabled: true },
      { label: "Workspace-only access boundary", enabled: true },
      { label: "Workspace-scoped domain and mailbox access", enabled: true },
    ],
  };

  return (
    <AppShell>
      <PageHeader
        title="Settings"
        description="Workspace identity, security defaults, and admin controls."
      />
      <StatusNotice errors={loadErrors} message="Some settings data is temporarily unavailable." />
      <WorkspaceSyncButton />
      <section className="settings-grid section">
        <div className="panel">
          <h2>Service Status</h2>
          <div className="endpoint-list">
            <div>
              <span>Control panel</span>
              <strong>{health.data.status === "ok" ? "Online" : "Offline"}</strong>
            </div>
            <div>
              <span>Mail delivery</span>
              <strong>{status.data.mailcow.connected ? "Connected" : "Disconnected"}</strong>
            </div>
            <div>
              <span>Access mode</span>
              <strong>Protected</strong>
            </div>
            {status.data.mailcow.error ? (
              <div>
                <span>Last status</span>
                <strong>Service needs attention</strong>
              </div>
            ) : null}
          </div>
        </div>

        <div className="panel">
          <h2>Workspace</h2>
          <div className="endpoint-list">
            <div>
              <span>Name</span>
              <strong>{workspace.data?.name ?? "Not configured"}</strong>
            </div>
            <div>
              <span>Workspaces</span>
              <strong>{workspace.data?.counts.workspaces ?? 1}</strong>
            </div>
            <div>
              <span>Domains</span>
              <strong>{workspace.data?.counts.domains ?? 0}</strong>
            </div>
            <div>
              <span>Users</span>
              <strong>{workspace.data?.counts.users ?? 0}</strong>
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
          <p>Create admins, support users, viewers, and superadmin operators.</p>
        </div>
        <UsersClient initialUsers={users.data} />
      </section>

      <section className="panel section">
        <div className="title">
          <h1>Audit Log</h1>
          <p>Recent control-panel actions for this workspace.</p>
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
            {audit.data.map((event) => (
              <tr key={event.id}>
                <td>{event.action}</td>
                <td>{event.target}</td>
                <td>{event.createdAt}</td>
              </tr>
            ))}
            {audit.data.length === 0 ? (
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
