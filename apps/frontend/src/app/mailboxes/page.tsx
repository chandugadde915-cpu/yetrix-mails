import { AppShell } from "@/components/AppShell";
import { formatStorage, getDummyData, usagePercent } from "@/lib/dummy-data";
import { Plus } from "lucide-react";

export default function MailboxesPage() {
  const { mailboxes } = getDummyData();

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
              <th>Name</th>
              <th>Quota</th>
              <th>Status</th>
              <th>Aliases</th>
              <th>Last login</th>
            </tr>
          </thead>
          <tbody>
            {mailboxes.map((mailbox) => (
              <tr key={mailbox.address}>
                <td>{mailbox.address}</td>
                <td>{mailbox.name}</td>
                <td>
                  <div className="quota-cell">
                    <span>
                      {formatStorage(mailbox.usedMb)} / {formatStorage(mailbox.quotaMb)}
                    </span>
                    <div className="progress">
                      <span style={{ width: `${usagePercent(mailbox.usedMb, mailbox.quotaMb)}%` }} />
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`badge ${mailbox.status === "active" ? "good" : "warn"}`}>
                    {mailbox.status}
                  </span>
                </td>
                <td>{mailbox.aliases.length || "-"}</td>
                <td>{mailbox.lastLogin}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </AppShell>
  );
}
