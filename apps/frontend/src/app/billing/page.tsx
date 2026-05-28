import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { apiGet, apiGetSafe, requirePageSession } from "@/lib/server-api";
import { Domain, Mailbox, formatStorage } from "@/lib/platform-data";

export const dynamic = "force-dynamic";

interface BillingUsage {
  plan: string;
  status: string;
  limits: {
    domains: number;
    mailboxes: number;
    aliases: number;
    users: number;
    storageMb: number;
  };
  usage: {
    domains: number;
    mailboxes: number;
    aliases: number;
    users: number;
    storageUsedMb: number;
    storageLimitMb: number;
  };
  overLimit: Record<string, boolean>;
}

export default async function BillingPage() {
  await requirePageSession();

  const [domains, mailboxes, billing] = await Promise.all([
    apiGet<Domain[]>("/api/domains"),
    apiGet<Mailbox[]>("/api/mailboxes"),
    apiGetSafe<BillingUsage | null>("/api/billing/usage", null),
  ]);
  const storageLimitMb = mailboxes.reduce((total, mailbox) => total + (mailbox.quotaMb ?? 0), 0);
  const storageUsedMb = mailboxes.reduce((total, mailbox) => total + (mailbox.usedMb ?? 0), 0);
  const activeMailboxes = mailboxes.filter((mailbox) => mailbox.status === "active").length;
  const usage = billing.data?.usage;
  const limits = billing.data?.limits;

  return (
    <AppShell>
      <PageHeader
        title="Billing"
        description="Live usage summary for domains, mailboxes, and allocated storage."
      />
      <section className="grid section">
        <div className="panel">
          <div className="metric">Plan</div>
          <div className="value">{billing.data?.plan ?? "Launch"}</div>
        </div>
        <div className="panel">
          <div className="metric">Active mailboxes</div>
          <div className="value">{activeMailboxes}</div>
        </div>
        <div className="panel">
          <div className="metric">Allocated storage</div>
          <div className="value">{formatStorage(usage?.storageLimitMb ?? storageLimitMb)}</div>
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
          <h1>Subscription Limits</h1>
          <p>Plan capacity for domains, users, mailboxes, and storage.</p>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Metric</th>
              <th>Current</th>
              <th>Plan limit</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Domains</td>
              <td>{usage?.domains ?? domains.length}</td>
              <td>{limits?.domains ?? "Included"}</td>
              <td>
                <span className={`badge ${billing.data?.overLimit.domains ? "warn" : "good"}`}>
                  {billing.data?.overLimit.domains ? "Over limit" : "Available"}
                </span>
              </td>
            </tr>
            <tr>
              <td>Mailboxes</td>
              <td>{usage?.mailboxes ?? mailboxes.length}</td>
              <td>{limits?.mailboxes ?? "Included"}</td>
              <td>
                <span className={`badge ${billing.data?.overLimit.mailboxes ? "warn" : "good"}`}>
                  {billing.data?.overLimit.mailboxes ? "Over limit" : "Available"}
                </span>
              </td>
            </tr>
            <tr>
              <td>Storage</td>
              <td>{formatStorage(usage?.storageUsedMb ?? storageUsedMb)} used</td>
              <td>{formatStorage(limits?.storageMb ?? storageLimitMb)}</td>
              <td>
                <span className={`badge ${billing.data?.overLimit.storage ? "warn" : "good"}`}>
                  {billing.data?.overLimit.storage ? "Over limit" : "Monitored"}
                </span>
              </td>
            </tr>
            <tr>
              <td>Workspace users</td>
              <td>{usage?.users ?? 0}</td>
              <td>{limits?.users ?? "Included"}</td>
              <td>
                <span className={`badge ${billing.data?.overLimit.users ? "warn" : "good"}`}>
                  {billing.data?.overLimit.users ? "Over limit" : "Available"}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </AppShell>
  );
}
