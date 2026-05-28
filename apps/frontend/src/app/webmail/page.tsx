import { AppShell } from "@/components/AppShell";
import { MailWorkspaceClient } from "@/components/MailWorkspaceClient";
import { apiGetSafe, requireAuthToken } from "@/lib/server-api";
import { Mailbox, mailAccess } from "@/lib/platform-data";
import { Inbox, Send, Server, Smartphone } from "lucide-react";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function WebmailPage() {
  if (!(await requireAuthToken())) {
    redirect("/login");
  }

  const mailboxesResult = await apiGetSafe<Mailbox[]>("/api/mailboxes", []);
  const mailboxes = mailboxesResult.data;
  const activeMailboxes = mailboxes.filter((mailbox) => mailbox.status === "active");

  return (
    <AppShell>
      <div className="topbar">
        <div className="title">
          <h1>Mail Workspace</h1>
          <p>Read inboxes and send messages from Yetrix without opening the mail engine UI.</p>
        </div>
      </div>
      {mailboxesResult.error ? (
        <div className="notice warn-notice">
          Mailboxes are temporarily unavailable. {mailboxesResult.error}
        </div>
      ) : null}

      <MailWorkspaceClient mailboxes={mailboxes} />

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
              <strong>Yetrix</strong>
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
