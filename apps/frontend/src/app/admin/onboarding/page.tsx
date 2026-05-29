import { PageHeader } from "@/components/PageHeader";
import { RoleBasedLayout } from "@/components/RoleBasedLayout";
import { Domain, domainHealth, Mailbox, PlatformStatus } from "@/lib/platform-data";
import { apiGetSafe } from "@/lib/server-api";
import { CheckCircle2, Circle, TestTube2 } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminOnboardingPage() {
  const [domains, mailboxes, status] = await Promise.all([
    apiGetSafe<Domain[]>("/api/domains", []),
    apiGetSafe<Mailbox[]>("/api/mailboxes", []),
    apiGetSafe<PlatformStatus>("/api/status", {}),
  ]);
  const verifiedDomain = domains.data.some((domain) => domainHealth(domain).healthy);
  const dkimReady = domains.data.some((domain) => domain.records?.some((record) => record.type === "DKIM" && record.status === "verified"));
  const firstMailbox = mailboxes.data.some((mailbox) => mailbox.status === "active");
  const steps = [
    { title: "Add domain", complete: domains.data.length > 0, href: "/admin/domains/create" },
    { title: "Show DNS records", complete: domains.data.length > 0, href: "/admin/domains" },
    { title: "Verify DNS", complete: verifiedDomain, href: "/admin/domains" },
    { title: "Generate and verify DKIM", complete: dkimReady, href: "/admin/domains" },
    { title: "Create first mailbox", complete: firstMailbox, href: "/admin/mailboxes/create" },
    { title: "Test IMAP/SMTP", complete: Boolean(status.data.mailcow?.connected && status.data.smtp?.connected), href: "/admin/settings" },
    { title: "Test send/receive", complete: firstMailbox && Boolean(status.data.smtp?.connected), href: "/mail/inbox" },
    { title: "Finish setup", complete: verifiedDomain && firstMailbox, href: "/admin/dashboard" },
  ];

  return (
    <RoleBasedLayout route="/admin/onboarding" permission="domain.create" crumbs={[{ label: "Admin" }, { label: "Onboarding" }]}>
      <PageHeader title="Workspace Onboarding" description="Guided setup from domain creation to live mailbox testing." />
      <section className="panel section">
        <div className="onboarding-steps">
          {steps.map((step, index) => (
            <Link className={step.complete ? "complete" : ""} href={step.href} key={step.title}>
              <span>{step.complete ? <CheckCircle2 size={18} /> : <Circle size={18} />}</span>
              <strong>Step {index + 1}: {step.title}</strong>
              <p>{step.complete ? "Complete" : "Needs action"}</p>
            </Link>
          ))}
        </div>
      </section>
      <section className="panel section">
        <div className="title">
          <h1>Live test</h1>
          <p>After setup, open the mailbox workspace and send a self-test message.</p>
        </div>
        <Link className="button" href="/mail/inbox">
          <TestTube2 size={18} />
          Open mail workspace
        </Link>
      </section>
    </RoleBasedLayout>
  );
}
