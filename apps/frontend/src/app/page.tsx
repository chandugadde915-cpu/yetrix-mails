import {
  ArrowRight,
  AtSign,
  Building2,
  CheckCircle2,
  CreditCard,
  Globe2,
  Inbox,
  KeyRound,
  LockKeyhole,
  LogIn,
  Mail,
  Network,
  Send,
  Settings2,
  ShieldCheck,
  UserPlus,
  Zap,
} from "lucide-react";
import Link from "next/link";

const features = [
  { icon: Network, label: "Guided domain setup" },
  { icon: Mail, label: "Custom business mailboxes" },
  { icon: ShieldCheck, label: "Secure mail authentication" },
  { icon: Zap, label: "Team inbox workspace" },
];

const portals = [
  {
    icon: UserPlus,
    title: "Start a workspace",
    text: "Create a company account, add your domain, and begin setting up business email.",
    href: "/signup",
    action: "Sign up",
  },
  {
    icon: LogIn,
    title: "Admin control panel",
    text: "Manage domains, mailboxes, aliases, billing, team roles, and workspace security.",
    href: "/login",
    action: "Admin login",
  },
  {
    icon: Inbox,
    title: "Mailbox workspace",
    text: "Open the separate mail workspace to read, send, draft, and manage inbox folders.",
    href: "/mail-login",
    action: "Mailbox login",
  },
];

const modules = [
  { icon: Globe2, title: "Domains", text: "Add customer domains and track DNS readiness." },
  { icon: AtSign, title: "Mailboxes", text: "Create business addresses with quotas and status controls." },
  { icon: Send, title: "Aliases", text: "Route team addresses to one or many destinations." },
  { icon: Settings2, title: "Admin tools", text: "Manage routing, DKIM, quarantine, and mailbox policies." },
  { icon: CreditCard, title: "Plans", text: "Prepare usage limits for paid workspace subscriptions." },
  { icon: ShieldCheck, title: "Security", text: "Keep platform, admin, and mailbox access separated." },
];

const roles = [
  {
    icon: LockKeyhole,
    title: "Superadmin",
    text: "Platform owner view for all workspaces, admins, users, domains, and mail inventory.",
  },
  {
    icon: Building2,
    title: "Workspace admin",
    text: "Customer admin view for one company workspace and its business email setup.",
  },
  {
    icon: KeyRound,
    title: "Mailbox user",
    text: "Simple mail-only login for inbox, compose, folders, attachments, and sent messages.",
  },
];

export default function LandingPage() {
  return (
    <main className="landing">
      <nav className="landing-nav" aria-label="Yetrix navigation">
        <Link className="landing-logo" href="/">
          <Mail size={22} />
          Yetrix Mails
        </Link>
        <div className="landing-actions">
          <Link className="button secondary landing-login" href="/signup">
            Sign up
          </Link>
          <Link className="button secondary landing-login" href="/mail-login">
            Mailbox
          </Link>
          <Link className="button secondary landing-login" href="/login">
            Login
            <ArrowRight size={18} />
          </Link>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <CheckCircle2 size={16} />
            Own your business email stack
          </div>
          <h1>Yetrix Mails</h1>
          <p>
            A Zoho-style business email workspace for custom domains, admin controls, mailbox
            users, aliases, DNS readiness, and a separate mail workspace.
          </p>
          <div className="hero-actions">
            <Link className="button hero-button" href="/signup">
              Create workspace
              <ArrowRight size={18} />
            </Link>
            <Link className="button secondary" href="/login">
              Admin login
            </Link>
            <Link className="button secondary" href="/mail-login">
              Mailbox login
            </Link>
            <span className="demo-credential">Business email for growing teams</span>
          </div>
        </div>

        <div className="mail-visual" aria-hidden="true">
          <div className="mail-node node-a">DNS</div>
          <div className="mail-node node-b">DKIM</div>
          <div className="mail-node node-c">Inbox</div>
          <div className="mail-node node-d">Send</div>
          <div className="mail-route route-one" />
          <div className="mail-route route-two" />
          <div className="mail-route route-three" />
          <div className="envelope envelope-one" />
          <div className="envelope envelope-two" />
          <div className="envelope envelope-three" />
        </div>
      </section>

      <section className="feature-strip" aria-label="Platform features">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <div className="feature-item" key={feature.label}>
              <Icon size={20} />
              <span>{feature.label}</span>
            </div>
          );
        })}
      </section>

      <section className="landing-section portal-grid" aria-label="Choose your portal">
        {portals.map((portal) => {
          const Icon = portal.icon;
          return (
            <Link className="portal-tile" href={portal.href} key={portal.title}>
              <span className="portal-icon">
                <Icon size={22} />
              </span>
              <strong>{portal.title}</strong>
              <p>{portal.text}</p>
              <span className="portal-action">
                {portal.action}
                <ArrowRight size={16} />
              </span>
            </Link>
          );
        })}
      </section>

      <section className="landing-section landing-panel">
        <div className="landing-section-head">
          <div>
            <span>Workspace suite</span>
            <h2>Everything an email hosting customer expects.</h2>
          </div>
          <p>
            Keep domain setup, mailbox operations, user management, and subscriptions in one calm
            business dashboard.
          </p>
        </div>
        <div className="module-grid">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <div className="module-tile" key={module.title}>
                <Icon size={21} />
                <strong>{module.title}</strong>
                <p>{module.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="landing-section role-band" aria-label="Role access">
        {roles.map((role) => {
          const Icon = role.icon;
          return (
            <div className="role-card" key={role.title}>
              <Icon size={22} />
              <strong>{role.title}</strong>
              <p>{role.text}</p>
            </div>
          );
        })}
      </section>

      <section className="landing-final">
        <div>
          <span>Yetrix workspace</span>
          <h2>Launch business email without exposing your mail engine.</h2>
        </div>
        <div className="landing-final-actions">
          <Link className="button hero-button" href="/signup">
            Sign up
            <ArrowRight size={18} />
          </Link>
          <Link className="button secondary" href="/login">
            Login
          </Link>
        </div>
      </section>
    </main>
  );
}
