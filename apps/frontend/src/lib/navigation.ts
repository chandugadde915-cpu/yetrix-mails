import {
  AtSign,
  CreditCard,
  Crown,
  Globe2,
  Inbox,
  LayoutDashboard,
  SlidersHorizontal,
  ShieldCheck,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles?: WorkspaceRole[];
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export type WorkspaceRole = "superadmin" | "owner" | "admin" | "support" | "viewer";

const allRoles: WorkspaceRole[] = ["superadmin", "owner", "admin", "support", "viewer"];
const workspaceManagerRoles: WorkspaceRole[] = ["superadmin", "owner", "admin", "support"];
const adminRoles: WorkspaceRole[] = ["superadmin", "owner", "admin"];

export const navSections: NavSection[] = [
  {
    title: "Start",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: allRoles },
    ],
  },
  {
    title: "Provision",
    items: [
      { href: "/domains", label: "Domains", icon: Globe2, roles: workspaceManagerRoles },
      { href: "/mailboxes", label: "Mailboxes", icon: Inbox, roles: workspaceManagerRoles },
      { href: "/aliases", label: "Aliases", icon: AtSign, roles: workspaceManagerRoles },
    ],
  },
  {
    title: "Operate",
    items: [
      { href: "/admin", label: "Admin Console", icon: SlidersHorizontal, roles: adminRoles },
      { href: "/operations", label: "Operations", icon: ShieldCheck, roles: adminRoles },
      { href: "/billing", label: "Billing", icon: CreditCard, roles: adminRoles },
      { href: "/settings", label: "Settings", icon: Settings, roles: adminRoles },
    ],
  },
  {
    title: "Platform",
    items: [
      { href: "/superadmin", label: "Superadmin", icon: Crown, roles: ["superadmin"] },
    ],
  },
];

export function navForRole(role?: string | null): NavSection[] {
  const currentRole = normalizeRole(role);

  return navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.roles || item.roles.includes(currentRole)),
    }))
    .filter((section) => section.items.length > 0);
}

export function normalizeRole(role?: string | null): WorkspaceRole {
  if (role === "superadmin" || role === "owner" || role === "admin" || role === "support") {
    return role;
  }

  return "viewer";
}
