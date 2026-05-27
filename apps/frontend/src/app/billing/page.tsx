import { AppShell } from "@/components/AppShell";

export default function BillingPage() {
  return (
    <AppShell>
      <div className="title">
        <h1>Billing</h1>
        <p>Plans, mailbox limits, storage quotas, and invoices.</p>
      </div>
      <section className="grid section">
        <div className="panel">
          <div className="metric">Plan</div>
          <div className="value">MVP</div>
        </div>
        <div className="panel">
          <div className="metric">Included mailboxes</div>
          <div className="value">25</div>
        </div>
        <div className="panel">
          <div className="metric">Storage</div>
          <div className="value">50 GB</div>
        </div>
      </section>
    </AppShell>
  );
}
