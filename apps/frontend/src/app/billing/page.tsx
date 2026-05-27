import { AppShell } from "@/components/AppShell";
import { getDummyData } from "@/lib/dummy-data";

export default function BillingPage() {
  const { billing, metrics } = getDummyData();

  return (
    <AppShell>
      <div className="title">
        <h1>Billing</h1>
        <p>Plans, mailbox limits, storage quotas, and invoices.</p>
      </div>
      <section className="grid section">
        <div className="panel">
          <div className="metric">Plan</div>
          <div className="value">{billing.plan}</div>
        </div>
        <div className="panel">
          <div className="metric">Included mailboxes</div>
          <div className="value">{billing.includedMailboxes}</div>
        </div>
        <div className="panel">
          <div className="metric">Storage</div>
          <div className="value">{metrics.storageUsedGb}/{billing.storageGb} GB</div>
        </div>
      </section>

      <section className="panel section">
        <div className="split-row">
          <div>
            <div className="metric">Monthly price</div>
            <div className="value">{billing.price}</div>
          </div>
          <div>
            <div className="metric">Next renewal</div>
            <div className="value small-value">{billing.renewalDate}</div>
          </div>
        </div>
      </section>

      <section className="panel section">
        <div className="title">
          <h1>Invoices</h1>
          <p>Dummy billing history for the demo dashboard.</p>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Date</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {billing.invoices.map((invoice) => (
              <tr key={invoice.id}>
                <td>{invoice.id}</td>
                <td>{invoice.date}</td>
                <td>{invoice.amount}</td>
                <td>
                  <span className="badge good">{invoice.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </AppShell>
  );
}
