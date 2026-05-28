import { AppShell } from "@/components/AppShell";
import { apiGet, requireAuthToken } from "@/lib/server-api";
import { Mailbox, mailAccess } from "@/lib/platform-data";
import { ExternalLink, Inbox, MailOpen, Send, Server, Smartphone } from "lucide-react";
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
          href={mailAccess.webmailUrl}
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
            <strong>{mailAccess.host}</strong>
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
                    IMAP/SMTP host: {mailAccess.host}. Use the mailbox password set on the
                    Mailboxes page.
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

      <section className="flow-detail-grid section">
        <div className="panel">
          <div className="metric-row">
            <Inbox size={20} />
            <div className="metric">Incoming mail</div>
          </div>
          <div className="endpoint-list">
            <div>
              <span>Protocol</span>
              <strong>IMAP</strong>
            </div>
            <div>
              <span>Server</span>
              <strong>{mailAccess.host}</strong>
            </div>
            <div>
              <span>Port</span>
              <strong>{mailAccess.imap.port}</strong>
            </div>
            <div>
              <span>Security</span>
              <strong>{mailAccess.imap.security}</strong>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="metric-row">
            <Send size={20} />
            <div className="metric">Outgoing mail</div>
          </div>
          <div className="endpoint-list">
            <div>
              <span>Protocol</span>
              <strong>SMTP</strong>
            </div>
            <div>
              <span>Server</span>
              <strong>{mailAccess.host}</strong>
            </div>
            <div>
              <span>Port</span>
              <strong>{mailAccess.smtp.port}</strong>
            </div>
            <div>
              <span>Security</span>
              <strong>{mailAccess.smtp.security}</strong>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="metric-row">
            <Smartphone size={20} />
            <div className="metric">Mobile login</div>
          </div>
          <div className="endpoint-list">
            <div>
              <span>Username</span>
              <strong>Full email address</strong>
            </div>
            <div>
              <span>Password</span>
              <strong>Mailbox password</strong>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="metric-row">
            <Server size={20} />
            <div className="metric">Mail workspace</div>
          </div>
          <div className="endpoint-list">
            <div>
              <span>Webmail</span>
              <strong>SOGo</strong>
            </div>
            <div>
              <span>Send/receive</span>
              <strong>{activeMailboxes.length > 0 ? "Ready" : "Create mailbox"}</strong>
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
