"use client";

import { CurrentUser, defaultDashboardForRole, navigationForUser, normalizeAppRole } from "@/lib/authz";
import { LogOut, Mail, Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export function RoleBasedSidebar({ user }: { user: CurrentUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const sections = navigationForUser(user);
  const dashboard = defaultDashboardForRole(user.role);
  const role = normalizeAppRole(user.role);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="sidebar role-sidebar">
      <Link className="brand" href={dashboard}>
        <span className="brand-mark">
          <Sparkles size={18} />
        </span>
        <span>
          Yetrix
          <small>{role === "superadmin" ? "Platform console" : role === "admin" ? "Workspace console" : "Mail"}</small>
        </span>
      </Link>
      <div className="sidebar-status">
        <span>{roleLabel(role)}</span>
        <strong>{user.workspace_name ?? user.name ?? user.email ?? "Yetrix Mail"}</strong>
      </div>
      <nav className="nav" aria-label="Role navigation">
        {sections.map((section) => (
          <div className="nav-section" key={section.title}>
            <div className="nav-label">{section.title}</div>
            {section.items.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link className={active ? "active" : ""} href={item.href} key={item.href}>
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
      <button className="logout-button" type="button" onClick={logout}>
        <LogOut size={18} />
        <span>Logout</span>
      </button>
    </aside>
  );
}

function roleLabel(role: string) {
  if (role === "superadmin") return "Super Admin";
  if (role === "admin") return "Admin Workspace";
  return "Mailbox User";
}
