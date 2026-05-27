import { AppShell } from "@/components/AppShell";
import { ExternalLink } from "lucide-react";

export default function WebmailPage() {
  return (
    <AppShell>
      <div className="topbar">
        <div className="title">
          <h1>Webmail</h1>
          <p>Roundcube is used for the first production MVP.</p>
        </div>
        <a className="button" href="https://webmail.yourmailplatform.com">
          <ExternalLink size={18} />
          Open webmail
        </a>
      </div>

      <section className="panel">
        <h2>Webmail routing</h2>
        <p>
          Point <span className="mono">webmail.yourmailplatform.com</span> to the AWS mail node.
          Later, this page can become a custom React webmail client backed by an IMAP API.
        </p>
      </section>
    </AppShell>
  );
}
