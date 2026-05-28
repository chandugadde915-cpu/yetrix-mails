import { AppShell } from "@/components/AppShell";
import { apiGet, requireAuthToken } from "@/lib/server-api";
import { Mailbox } from "@/lib/platform-data";
import { ExternalLink, MailOpen } from "lucide-react";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function WebmailPage() {
  if (!(await requireAuthToken())) {
    redirect("/login");
  }

  const mailboxes = await apiGet<Mailbox[]>("/api/mailboxes");
  const activeMailboxes = mailboxes.filter((mailbox) => mailbox.status === "active");

  return (
    <AppShell>
      <div className="topbar">
        <div className="title">
          <h1>Webmail</h1>
          <p>Open Mailcow webmail and use the mailbox credentials created in this dashboard.</p>
        </div>
        <a
          className="button"
          href="https://mail.yetrixtechnologies.com/SOGo/"
          rel="noreferrer"
          target="_blank"
        >
          <ExternalLink size={18} />
          Open webmail
        </a>
      </div>

      <section className="webmail-layout">
        <aside className="panel folder-list">
          <div className="folder-row">
            <span>Active mailboxes</span>
            <strong>{activeMailboxes.length}</strong>
          </div>
          <div className="folder-row">
            <span>Total mailboxes</span>
            <strong>{mailboxes.length}</strong>
          </div>
          <div className="folder-row">
            <span>Webmail host</span>
            <strong>mail.yetrixtechnologies.com</strong>
          </div>
        </aside>

        <div className="panel">
          <div className="title">
            <h1>Mailbox Access</h1>
            <p>Use these active addresses to sign in to webmail or mobile mail apps.</p>
          </div>
          <div className="message-list">
            {mailboxes.map((mailbox) => (
              <article className="message-row" key={mailbox.address}>
                <MailOpen size={20} />
                <div>
                  <div className="message-head">
                    <strong>{mailbox.address}</strong>
                    <span>{mailbox.domain}</span>
                  </div>
                  <h2>{mailbox.name || mailbox.address}</h2>
                  <p>
                    IMAP/SMTP host: mail.yetrixtechnologies.com. Use the mailbox password set on
                    the Mailboxes page.
                  </p>
                </div>
                <span className={`badge ${mailbox.status === "active" ? "good" : "warn"}`}>
                  {mailbox.status}
                </span>
              </article>
            ))}
            {mailboxes.length === 0 ? (
              <article className="message-row">
                <MailOpen size={20} />
                <div>
                  <div className="message-head">
                    <strong>No mailboxes yet</strong>
                  </div>
                  <h2>Create a mailbox first</h2>
                  <p>Once a mailbox exists, it appears here for webmail and mobile setup.</p>
                </div>
              </article>
            ) : null}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
