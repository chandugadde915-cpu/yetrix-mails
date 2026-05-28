import { AppShell } from "@/components/AppShell";
import { apiGet, requireAuthToken } from "@/lib/server-api";
import { Domain, Mailbox, formatStorage } from "@/lib/platform-data";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  if (!(await requireAuthToken())) {
    redirect("/login");
  }

  const [domains, mailboxes] = await Promise.all([
    apiGet<Domain[]>("/api/domains"),
    apiGet<Mailbox[]>("/api/mailboxes"),
  ]);
  const storageLimitMb = mailboxes.reduce((total, mailbox) => total + (mailbox.quotaMb ?? 0), 0);
  const storageUsedMb = mailboxes.reduce((total, mailbox) => total + (mailbox.usedMb ?? 0), 0);
  const activeMailboxes = mailboxes.filter((mailbox) => mailbox.status === "active").length;

  return (
    <AppShell>
      <div className="title">
        <h1>Billing</h1>
        <p>Live usage summary for domains, mailboxes, and allocated storage.</p>
      </div>
      <section className="grid section">
        <div className="panel">
          <div className="metric">Plan</div>
          <div className="value">Launch</div>
        </div>
        <div className="panel">
          <div className="metric">Active mailboxes</div>
          <div className="value">{activeMailboxes}</div>
        </div>
        <div className="panel">
          <div className="metric">Allocated storage</div>
          <div className="value">{formatStorage(storageLimitMb)}</div>
        </div>
      </section>

      <section className="panel section">
        <div className="split-row">
          <div>
            <div className="metric">Domains</div>
            <div className="value">{domains.length}</div>
          </div>
          <div>
            <div className="metric">Storage used</div>
            <div className="value small-value">{formatStorage(storageUsedMb)}</div>
          </div>
        </div>
      </section>

      <section className="panel section">
        <div className="title">
          <h1>Usage Ledger</h1>
          <p>Current customer-facing capacity pulled through the Yetrix backend API.</p>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Metric</th>
              <th>Current</th>
              <th>Billing status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Domains</td>
              <td>{domains.length}</td>
              <td>
                <span className="badge good">Included</span>
              </td>
            </tr>
            <tr>
              <td>Mailboxes</td>
              <td>{mailboxes.length}</td>
              <td>
                <span className="badge good">Included</span>
              </td>
            </tr>
            <tr>
              <td>Storage</td>
              <td>{formatStorage(storageUsedMb)} used</td>
              <td>
                <span className="badge good">Monitored</span>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </AppShell>
  );
}
