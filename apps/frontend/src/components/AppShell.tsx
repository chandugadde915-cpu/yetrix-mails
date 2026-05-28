"use client";

import {
  AtSign,
  CreditCard,
  Globe2,
  Inbox,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Mail,
  ShieldCheck,
  Settings,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const navSections = [
  {
    title: "Launch",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/setup", label: "Launch Flow", icon: ListChecks },
      { href: "/domains", label: "Domains", icon: Globe2 },
      { href: "/mailboxes", label: "Mailboxes", icon: Inbox },
      { href: "/aliases", label: "Aliases", icon: AtSign },
    ],
  },
  {
    title: "Workspace",
    items: [
      { href: "/webmail", label: "Mail Workspace", icon: Mail },
      { href: "/operations", label: "Operations", icon: ShieldCheck },
    ],
  },
  {
    title: "Business",
    items: [
      { href: "/billing", label: "Billing", icon: CreditCard },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <Link className="brand" href="/dashboard">
          <span className="brand-mark">
            <Sparkles size={18} />
          </span>
          <span>
            Yetrix
            <small>Mail hosting OS</small>
          </span>
        </Link>
        <div className="sidebar-status">
          <span>Production</span>
          <strong>Vercel + AWS</strong>
        </div>
        <nav className="nav" aria-label="Main navigation">
          {navSections.map((section) => (
            <div className="nav-section" key={section.title}>
              <div className="nav-label">{section.title}</div>
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link className={isActive ? "active" : ""} href={item.href} key={item.href}>
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <button className="logout-button" onClick={logout}>
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
