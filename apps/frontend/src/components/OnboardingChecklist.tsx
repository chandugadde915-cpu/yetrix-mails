import type { Domain, Mailbox, PlatformStatus } from "@/lib/platform-data";
import { domainHealth, workspaceProgress } from "@/lib/platform-data";
import { ArrowRight, CheckCircle2, Circle, Globe2, Inbox, RadioTower, Send, Server } from "lucide-react";
import Link from "next/link";

const stepIcons = [Server, Globe2, RadioTower, Inbox, Send];

export function OnboardingChecklist({
  domains,
  mailboxes,
  status,
}: {
  domains: Domain[];
  mailboxes: Mailbox[];
  status?: PlatformStatus;
}) {
  const progress = workspaceProgress(domains, mailboxes, status);
  const nextStep = progress.steps.find((step) => !step.complete) ?? progress.steps.at(-1);
  const verifiedDomains = domains.filter((domain) => domainHealth(domain).healthy).length;
  const activeMailboxes = mailboxes.filter((mailbox) => mailbox.status === "active").length;

  return (
    <section className="launch-console section">
      <div className="launch-console-head">
        <div>
          <div className="eyebrow light">
            <RadioTower size={16} />
            Workspace launch path
          </div>
          <h2>{progress.readyToSendReceive ? "Mail flow is ready." : nextStep?.title ?? "Setup"}</h2>
          <p>
            {verifiedDomains} verified domain{verifiedDomains === 1 ? "" : "s"} and {activeMailboxes} active mailbox
            {activeMailboxes === 1 ? "" : "es"} connected to the Yetrix mail path.
          </p>
        </div>
        <Link className="button" href={nextStep?.href ?? "/webmail"}>
          <ArrowRight size={18} />
          {progress.readyToSendReceive ? "Open webmail" : "Continue"}
        </Link>
      </div>

      <div className="launch-console-body">
        <div className="launch-ring" aria-label={`${progress.percent}% launch progress`}>
          <strong>{progress.percent}%</strong>
          <span>{progress.completed} of {progress.total}</span>
        </div>

        <div className="launch-checklist">
          {progress.steps.map((step, index) => {
            const Icon = stepIcons[index] ?? Circle;
            return (
              <Link
                className={`launch-check ${step.complete ? "complete" : ""}`}
                href={step.href}
                key={step.title}
              >
                <span className="launch-check-icon">
                  <Icon size={18} />
                </span>
                <span>
                  <strong>{step.title}</strong>
                  <small>{step.detail}</small>
                </span>
                {step.complete ? <CheckCircle2 size={20} /> : <Circle size={20} />}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
