import { ArrowRight, CheckCircle2, Mail, Network, ShieldCheck, Zap } from "lucide-react";
import Link from "next/link";

const features = [
  { icon: Network, label: "Domain DNS verification" },
  { icon: Mail, label: "Custom business mailboxes" },
  { icon: ShieldCheck, label: "SPF, DKIM, DMARC ready" },
  { icon: Zap, label: "Vercel plus AWS deployment" },
];

export default function LandingPage() {
  return (
    <main className="landing">
      <nav className="landing-nav" aria-label="Yetrix navigation">
        <Link className="landing-logo" href="/">
          <Mail size={22} />
          Yetrix Mails
        </Link>
        <Link className="button secondary landing-login" href="/login">
          Login
          <ArrowRight size={18} />
        </Link>
      </nav>

      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <CheckCircle2 size={16} />
            Own your business email stack
          </div>
          <h1>Yetrix Mails</h1>
          <p>
            A custom-domain email hosting platform with Vercel for the dashboard and AWS for
            backend, SMTP, IMAP, DNS verification, and webmail infrastructure.
          </p>
          <div className="hero-actions">
            <Link className="button hero-button" href="/login">
              Login
              <ArrowRight size={18} />
            </Link>
            <span className="demo-credential">Secure admin access</span>
          </div>
        </div>

        <div className="mail-visual" aria-hidden="true">
          <div className="mail-node node-a">MX</div>
          <div className="mail-node node-b">DKIM</div>
          <div className="mail-node node-c">IMAP</div>
          <div className="mail-node node-d">SMTP</div>
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
    </main>
  );
}
