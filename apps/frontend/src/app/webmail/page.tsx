import { AppShell } from "@/components/AppShell";
import { getDummyData } from "@/lib/dummy-data";
import { ExternalLink, MailOpen } from "lucide-react";

export default function WebmailPage() {
  const { webmail, workspace } = getDummyData();

  return (
    <AppShell>
      <div className="topbar">
        <div className="title">
          <h1>Webmail</h1>
          <p>Roundcube is used for the first production MVP.</p>
        </div>
        <a className="button" href={`https://${workspace.webmailUrl}`}>
          <ExternalLink size={18} />
          Open webmail
        </a>
      </div>

      <section className="webmail-layout">
        <aside className="panel folder-list">
          {webmail.folders.map((folder) => (
            <div className="folder-row" key={folder.name}>
              <span>{folder.name}</span>
              <strong>{folder.count}</strong>
            </div>
          ))}
        </aside>

        <div className="panel">
          <div className="title">
            <h1>Inbox Preview</h1>
            <p>Dummy messages for the frontend webmail workspace.</p>
          </div>
          <div className="message-list">
            {webmail.messages.map((message) => (
              <article className="message-row" key={`${message.from}-${message.subject}`}>
                <MailOpen size={20} />
                <div>
                  <div className="message-head">
                    <strong>{message.from}</strong>
                    <span>{message.time}</span>
                  </div>
                  <h2>{message.subject}</h2>
                  <p>{message.preview}</p>
                </div>
                <span className={`badge ${message.status === "unread" ? "warn" : "good"}`}>
                  {message.status}
                </span>
              </article>
            ))}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
