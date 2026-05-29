import { HealthBadge } from "@/components/StatusBadge";
import { MetricCard } from "@/components/MetricCard";
import { PageHeader } from "@/components/PageHeader";
import { RoleBasedLayout } from "@/components/RoleBasedLayout";
import { Domain, domainHealth, Mailbox, PlatformStatus, workspaceProgress } from "@/lib/platform-data";
import { apiGetSafe } from "@/lib/server-api";
import { Globe2, Inbox, ShieldCheck, UserPlus } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [domains, mailboxes, status] = await Promise.all([
    apiGetSafe<Domain[]>("/api/domains", []),
    apiGetSafe<Mailbox[]>("/api/mailboxes", []),
    apiGetSafe<PlatformStatus>("/api/status", {}),
  ]);
  const progress = workspaceProgress(domains.data, mailboxes.data, status.data);
  const verifiedDomains = domains.data.filter((domain) => domainHealth(domain).healthy).length;
  const activeMailboxes = mailboxes.data.filter((mailbox) => mailbox.status === "active").length;

  return (
    <RoleBasedLayout route="/admin/dashboard" permission="workspace.view" crumbs={[{ label: "Admin" }, { label: "Dashboard" }]}>
      <PageHeader
        title="Admin Dashboard"
        description="Your workspace domains, mailboxes, DNS readiness, and setup progress."
        actions={<Link className="button" href="/admin/onboarding">Continue setup</Link>}
      />
      <section className="health-strip">
        <HealthBadge label="Mailcow" connected={status.data.mailcow?.connected} />
        <HealthBadge label="SMTP" connected={status.data.smtp?.connected} />
        <HealthBadge label="API" connected={status.data.api?.healthy} />
      </section>
      <section className="metric-grid">
        <MetricCard icon={Globe2} label="Workspace domains" value={`${verifiedDomains}/${domains.data.length}`} />
        <MetricCard icon={Inbox} label="Workspace mailboxes" value={activeMailboxes} />
        <MetricCard icon={ShieldCheck} label="Setup progress" value={`${progress.percent}%`} />
        <MetricCard icon={UserPlus} label="Remaining setup" value={`${progress.total - progress.completed} steps`} />
      </section>
      <section className="panel section">
        <div className="title">
          <h1>Setup progress</h1>
          <p>Finish these steps to make the workspace production-ready.</p>
        </div>
        <div className="onboarding-steps compact">
          {progress.steps.map((step, index) => (
            <Link className={step.complete ? "complete" : ""} href={step.href} key={step.title}>
              <span>{index + 1}</span>
              <strong>{step.title}</strong>
              <p>{step.detail}</p>
            </Link>
          ))}
        </div>
      </section>
    </RoleBasedLayout>
  );
}
