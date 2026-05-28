"use client";

import { navForRole } from "@/lib/navigation";
import { LogOut, Mail, Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

interface ProfileResponse {
  success: boolean;
  data?: {
    role?: string | null;
  } | null;
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const visibleNavSections = navForRole(role);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const response = await fetch("/api/backend/api/me", {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as ProfileResponse;
        if (active) {
          setRole(payload.data?.role ?? "viewer");
        }
      } catch {
        if (active) {
          setRole("viewer");
        }
      }
    }

    void loadProfile();

    return () => {
      active = false;
    };
  }, []);

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
          <span>Workspace</span>
          <strong>Live Mail</strong>
        </div>
        <nav className="nav" aria-label="Main navigation">
          {visibleNavSections.map((section) => (
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
        <Link className="mailbox-entry" href="/mail-login">
          <Mail size={18} />
          <span>Mailbox login</span>
        </Link>
        <button className="logout-button" onClick={logout}>
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
