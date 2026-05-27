import { AppShell } from "@/components/AppShell";

export default function SettingsPage() {
  return (
    <AppShell>
      <div className="title">
        <h1>Settings</h1>
        <p>Workspace identity, security defaults, and admin controls.</p>
      </div>
      <section className="panel section">
        <h2>Security defaults</h2>
        <p>Require strong mailbox passwords, submission over TLS, and admin audit logging.</p>
      </section>
    </AppShell>
  );
}
