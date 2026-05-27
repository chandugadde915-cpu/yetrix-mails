"use client";

import { CreditCard, Globe2, Inbox, LayoutDashboard, Mail, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/domains", label: "Domains", icon: Globe2 },
  { href: "/mailboxes", label: "Mailboxes", icon: Inbox },
  { href: "/webmail", label: "Webmail", icon: Mail },
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">OwnMail</div>
        <nav className="nav" aria-label="Main navigation">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link className={isActive ? "active" : ""} href={item.href} key={item.href}>
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
