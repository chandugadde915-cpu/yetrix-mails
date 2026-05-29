import {
  AtSign,
  Building2,
  ClipboardList,
  Crown,
  Globe2,
  Inbox,
  LayoutDashboard,
  Mail,
  Send,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";

export type AppRole = "superadmin" | "admin" | "user";

export type PermissionKey =
  | "workspace.view"
  | "workspace.create"
  | "workspace.edit"
  | "workspace.delete"
  | "admin.create"
  | "admin.edit"
  | "admin.delete"
  | "permission.manage"
  | "domain.view"
  | "domain.create"
  | "domain.edit"
  | "domain.delete"
  | "mailbox.view"
  | "mailbox.create"
  | "mailbox.edit"
  | "mailbox.delete"
  | "user.view"
  | "user.create"
  | "user.edit"
  | "user.delete"
  | "mail.access"
  | "system.manage"
  | "audit.view"
  | "impersonation.use";

export interface CurrentUser {
  id?: string;
  email?: string;
  username?: string | null;
  name?: string | null;
  role?: string | null;
  workspaceId?: string | null;
  workspace_id?: string | null;
  workspace_name?: string | null;
  permissions?: PermissionKey[];
}

export interface NavigationItem {
  href: string;
  label: string;
  icon: LucideIcon;
  permission?: PermissionKey;
}

export interface NavigationSection {
  title: string;
  items: NavigationItem[];
}

export const rolePermissions: Record<AppRole, PermissionKey[]> = {
  superadmin: [
    "workspace.view",
    "workspace.create",
    "workspace.edit",
    "workspace.delete",
    "admin.create",
    "admin.edit",
    "admin.delete",
    "permission.manage",
    "domain.view",
    "domain.create",
    "domain.edit",
    "domain.delete",
    "mailbox.view",
    "mailbox.create",
    "mailbox.edit",
    "mailbox.delete",
    "user.view",
    "user.create",
    "user.edit",
    "user.delete",
    "mail.access",
    "system.manage",
    "audit.view",
    "impersonation.use",
  ],
  admin: [
    "workspace.view",
    "workspace.edit",
    "domain.view",
    "domain.create",
    "domain.edit",
    "domain.delete",
    "mailbox.view",
    "mailbox.create",
    "mailbox.edit",
    "mailbox.delete",
    "user.view",
    "user.create",
    "user.edit",
    "user.delete",
    "mail.access",
    "audit.view",
  ],
  user: ["mail.access"],
};

export const superadminNavigation: NavigationSection[] = [
  {
    title: "Platform",
    items: [
      { href: "/superadmin/dashboard", label: "Dashboard", icon: LayoutDashboard, permission: "workspace.view" },
      { href: "/superadmin/workspaces", label: "Workspaces", icon: Building2, permission: "workspace.view" },
      { href: "/superadmin/admins", label: "Admins", icon: Crown, permission: "admin.edit" },
      { href: "/superadmin/permissions", label: "Permissions", icon: ShieldCheck, permission: "permission.manage" },
      { href: "/superadmin/domains", label: "Domains", icon: Globe2, permission: "domain.view" },
      { href: "/superadmin/mailboxes", label: "Mailboxes", icon: Inbox, permission: "mailbox.view" },
      { href: "/superadmin/audit-logs", label: "Audit Logs", icon: ClipboardList, permission: "audit.view" },
      { href: "/superadmin/system-settings", label: "System Settings", icon: Settings, permission: "system.manage" },
    ],
  },
  {
    title: "Mailbox",
    items: [{ href: "/mail/inbox", label: "Mail", icon: Mail, permission: "mail.access" }],
  },
];

export const adminNavigation: NavigationSection[] = [
  {
    title: "Workspace",
    items: [
      { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, permission: "workspace.view" },
      { href: "/admin/domains", label: "Domains", icon: Globe2, permission: "domain.view" },
      { href: "/admin/mailboxes", label: "Mailboxes", icon: Inbox, permission: "mailbox.view" },
      { href: "/admin/users", label: "Users", icon: Users, permission: "user.view" },
      { href: "/admin/onboarding", label: "Onboarding", icon: SlidersHorizontal, permission: "domain.create" },
      { href: "/mail/inbox", label: "Mail", icon: Mail, permission: "mail.access" },
      { href: "/admin/settings", label: "Settings", icon: Settings, permission: "workspace.edit" },
    ],
  },
];

export const userNavigation: NavigationSection[] = [
  {
    title: "Mail",
    items: [
      { href: "/mail/inbox", label: "Inbox", icon: Inbox, permission: "mail.access" },
      { href: "/mail/sent", label: "Sent", icon: Send, permission: "mail.access" },
      { href: "/mail/compose", label: "Compose", icon: AtSign, permission: "mail.access" },
      { href: "/mail/profile", label: "Profile", icon: UserCog, permission: "mail.access" },
      { href: "/mail/settings", label: "Settings", icon: Settings, permission: "mail.access" },
    ],
  },
];

export function normalizeAppRole(role?: string | null): AppRole {
  if (role === "superadmin") return "superadmin";
  if (role === "owner" || role === "admin" || role === "support") return "admin";
  return "user";
}

export function hasRole(user: CurrentUser | null | undefined, role: AppRole) {
  return normalizeAppRole(user?.role) === role;
}

export function hasPermission(user: CurrentUser | null | undefined, permission: PermissionKey) {
  const role = normalizeAppRole(user?.role);
  return Boolean(user?.permissions?.includes(permission) || rolePermissions[role].includes(permission));
}

export function canAccessWorkspace(user: CurrentUser | null | undefined, workspaceId?: string | null) {
  if (!workspaceId) return true;
  if (hasRole(user, "superadmin")) return true;
  return (user?.workspaceId ?? user?.workspace_id) === workspaceId;
}

export function canAccessRoute(user: CurrentUser | null | undefined, route: string) {
  const role = normalizeAppRole(user?.role);
  if (role === "superadmin") {
    return route.startsWith("/superadmin") || route.startsWith("/admin") || route.startsWith("/mail");
  }
  if (role === "admin") {
    return route.startsWith("/admin") || route.startsWith("/mail");
  }
  return route.startsWith("/mail");
}

export function navigationForUser(user: CurrentUser | null | undefined) {
  const role = normalizeAppRole(user?.role);
  const sections =
    role === "superadmin" ? superadminNavigation : role === "admin" ? adminNavigation : userNavigation;

  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.permission || hasPermission(user, item.permission)),
    }))
    .filter((section) => section.items.length > 0);
}

export function defaultDashboardForRole(role?: string | null) {
  const normalized = normalizeAppRole(role);
  if (normalized === "superadmin") return "/superadmin/dashboard";
  if (normalized === "admin") return "/admin/dashboard";
  return "/mail/inbox";
}
