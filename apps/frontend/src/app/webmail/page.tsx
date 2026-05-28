import { AppShell } from "@/components/AppShell";
import { MailWorkspaceClient } from "@/components/MailWorkspaceClient";
import { PageHeader } from "@/components/PageHeader";
import { StatusNotice } from "@/components/StatusNotice";
import { apiGetSafe, requirePageSession } from "@/lib/server-api";
import { Mailbox, mailAccess } from "@/lib/platform-data";
import { Inbox, Send, Server, Smartphone } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function WebmailPage() {
  await requirePageSession();

  const mailboxesResult = await apiGetSafe<Mailbox[]>("/api/mailboxes", []);
  const mailboxes = mailboxesResult.data;
  const activeMailboxes = mailboxes.filter((mailbox) => mailbox.status === "active");

  return (
    <AppShell>
      <PageHeader
        title="Mail Workspace"
        description="Read inboxes and send messages from Yetrix without opening the mail engine UI."
      />
      <StatusNotice
        errors={[mailboxesResult.error]}
        message="Mailboxes are temporarily unavailable."
      />

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
