import {
  Domain,
  Mailbox,
  PlatformStatus,
  domainHealth,
  mailAccess,
  workspaceProgress,
} from "@/lib/platform-data";
import {
  CheckCircle2,
  Circle,
  Globe2,
  Inbox,
  MailCheck,
  Network,
  Server,
} from "lucide-react";
import Link from "next/link";

export function WorkspaceFlow({
  domains,
  mailboxes,
  status,
}: {
  domains: Domain[];
  mailboxes: Mailbox[];
  status?: PlatformStatus;
}) {
  const progress = workspaceProgress(domains, mailboxes, status);
  const verifiedDomains = domains.filter((domain) => domainHealth(domain).healthy);
  const primaryDomain = verifiedDomains[0]?.domain ?? domains[0]?.domain ?? "yetrixtechnologies.com";
  const firstMailbox = mailboxes.find((mailbox) => mailbox.status === "active") ?? mailboxes[0];

  return (
    <>
      <section className="launch-hero">
        <div>
          <div className="eyebrow light">
            <MailCheck size={16} />
            Production launch flow
          </div>
          <h2>From domain to working inbox in one workspace.</h2>
          <p>
            Add a domain, verify mail DNS, create mailboxes, then open webmail or configure mobile
            mail apps from the Yetrix workspace.
          </p>
          <div className="launch-actions">
            <Link
              className="button"
              href={
                progress.readyToSendReceive
                  ? "/webmail"
                  : progress.steps.find((step) => !step.complete)?.href ?? "/webmail"
              }
            >
              {progress.readyToSendReceive ? "Open mail workspace" : "Continue setup"}
            </Link>
            <Link className="button secondary" href="/mailboxes#mailbox-create">
              Create mailbox
            </Link>
          </div>
        </div>
        <div className="launch-meter" aria-label="Workspace launch progress">
          <strong>{progress.percent}%</strong>
          <span>
            {progress.completed}/{progress.total} complete
          </span>
          <div className="progress">
            <span style={{ width: `${progress.percent}%` }} />
          </div>
        </div>
      </section>

      <section className="flow-grid section">
        {progress.steps.map((step, index) => (
          <Link
            className={`flow-step ${step.complete ? "complete" : ""}`}
            href={step.href}
            key={step.title}
          >
            <div className="flow-step-index">{index + 1}</div>
            <div>
              <h3>{step.title}</h3>
              <p>{step.detail}</p>
            </div>
            {step.complete ? <CheckCircle2 size={21} /> : <Circle size={21} />}
          </Link>
        ))}
      </section>

      <section className="flow-detail-grid section">
        <div className="panel">
          <div className="metric-row">
            <Globe2 size={20} />
            <div className="metric">Domain routing</div>
          </div>
          <div className="value small-value">{primaryDomain}</div>
          <div className="endpoint-list">
            <div>
              <span>MX host</span>
              <strong>{mailAccess.host}</strong>
            </div>
            <div>
              <span>Verified domains</span>
              <strong>{verifiedDomains.length}</strong>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="metric-row">
            <Inbox size={20} />
            <div className="metric">Mailbox login</div>
          </div>
          <div className="value small-value">{firstMailbox?.address ?? "No mailbox yet"}</div>
          <div className="endpoint-list">
            <div>
              <span>Webmail</span>
              <strong>Yetrix</strong>
            </div>
            <div>
              <span>Status</span>
              <strong>{firstMailbox ? firstMailbox.status : "Not created"}</strong>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="metric-row">
            <Server size={20} />
            <div className="metric">Mail apps</div>
          </div>
          <div className="endpoint-list no-top">
            <div>
              <span>IMAP</span>
              <strong>
                {mailAccess.host}:{mailAccess.imap.port}
              </strong>
            </div>
            <div>
              <span>SMTP</span>
              <strong>
                {mailAccess.host}:{mailAccess.smtp.port}
              </strong>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="metric-row">
            <Network size={20} />
            <div className="metric">API path</div>
          </div>
          <div className="endpoint-list no-top">
            <div>
              <span>Frontend</span>
              <strong>Vercel</strong>
            </div>
            <div>
              <span>Backend</span>
              <strong>{status?.mailcow?.connected ? "Connected" : "Needs attention"}</strong>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
