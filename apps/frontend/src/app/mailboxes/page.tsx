import { AppShell } from "@/components/AppShell";
import { apiGet } from "@/lib/api";
import { Plus } from "lucide-react";

const fallbackMailboxes: Array<{
  address: string;
  quotaMb: number;
  status: "active" | "disabled";
}> = [];

export default async function MailboxesPage() {
  const mailboxes = await apiGet("/mailboxes", fallbackMailboxes);

  return (
    <AppShell>
      <div className="topbar">
        <div className="title">
          <h1>Mailboxes</h1>
          <p>Create addresses, reset passwords, and manage storage quotas.</p>
        </div>
        <button className="button">
          <Plus size={18} />
          New mailbox
        </button>
      </div>

      <section className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Quota</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {mailboxes.map((mailbox) => (
              <tr key={mailbox.address}>
                <td>{mailbox.address}</td>
                <td>{Math.round(mailbox.quotaMb / 1024)} GB</td>
                <td>
                  <span className={`badge ${mailbox.status === "active" ? "good" : "warn"}`}>
                    {mailbox.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </AppShell>
  );
}
