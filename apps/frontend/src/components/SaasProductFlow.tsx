import type { Domain, Mailbox, PlatformStatus } from "@/lib/platform-data";
import { domainHealth, workspaceProgress } from "@/lib/platform-data";
import { productFlowStages } from "@/lib/screen-flow";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Circle,
  Crown,
  Globe2,
  Inbox,
  LayoutDashboard,
  Mail,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";

const stageIcons = [Users, LayoutDashboard, Globe2, Inbox, Mail, ShieldCheck, Crown];

export function SaasProductFlow({
  domains,
  mailboxes,
  status,
}: {
  domains: Domain[];
  mailboxes: Mailbox[];
  status?: PlatformStatus;
}) {
  const progress = workspaceProgress(domains, mailboxes, status);
  const verifiedDomains = domains.filter((domain) => domainHealth(domain).healthy).length;
  const activeMailboxes = mailboxes.filter((mailbox) => mailbox.status === "active").length;
  const currentStage = productFlowStages.find((stage) => !stageReady(stage.gate, {
    connected: Boolean(status?.mailcow?.connected),
    domains: domains.length,
    verifiedDomains,
    activeMailboxes,
  })) ?? productFlowStages[productFlowStages.length - 1];

  return (
    <section className="saas-flow section">
      <div className="saas-flow-head">
        <div>
          <div className="eyebrow light">
            <Building2 size={16} />
            SaaS screen map
          </div>
          <h2>{currentStage.title}</h2>
          <p>{currentStage.outcome}</p>
        </div>
        <Link className="button" href={progress.steps.find((step) => !step.complete)?.href ?? "/webmail"}>
          <ArrowRight size={18} />
          Next screen
        </Link>
      </div>

      <div className="role-lanes">
        <div>
          <span>Workspace admin</span>
          <strong>Dashboard - Domains - Mailboxes - Aliases - Billing - Settings</strong>
        </div>
        <div>
          <span>Mailbox user</span>
          <strong>Mail Workspace</strong>
        </div>
        <div>
          <span>Operator</span>
          <strong>Operations - Logs - Routing - Health</strong>
        </div>
        <div>
          <span>Superadmin</span>
          <strong>All tenants - Users - Global inventory</strong>
        </div>
      </div>

      <div className="saas-stage-grid">
        {productFlowStages.map((stage, index) => {
          const Icon = stageIcons[index] ?? Circle;
          const ready = stageReady(stage.gate, {
            connected: Boolean(status?.mailcow?.connected),
            domains: domains.length,
            verifiedDomains,
            activeMailboxes,
          });

          return (
            <div className={`saas-stage ${ready ? "complete" : ""}`} key={stage.id}>
              <div className="saas-stage-top">
                <span className="saas-stage-icon">
                  <Icon size={18} />
                </span>
                {ready ? <CheckCircle2 size={20} /> : <Circle size={20} />}
              </div>
              <h3>{stage.title}</h3>
              <p>{stage.outcome}</p>
              <div className="screen-chips">
                {stage.screens.map((screen) => (
                  <Link href={screen.href} key={`${stage.id}-${screen.href}-${screen.label}`}>
                    {screen.label}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function stageReady(
  gate: string,
  state: {
    connected: boolean;
    domains: number;
    verifiedDomains: number;
    activeMailboxes: number;
  },
) {
  switch (gate) {
    case "access":
      return true;
    case "engine":
      return state.connected;
    case "domain":
      return state.domains > 0;
    case "dns":
      return state.verifiedDomains > 0;
    case "mailbox":
      return state.activeMailboxes > 0;
    case "operations":
      return state.connected && state.activeMailboxes > 0;
    case "platform":
      return true;
    default:
      return false;
  }
}
