import {
  AtSign,
  CreditCard,
  Crown,
  Globe2,
  Inbox,
  LayoutDashboard,
  Mail,
  SlidersHorizontal,
  ShieldCheck,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const navSections: NavSection[] = [
  {
    title: "Start",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: "Provision",
    items: [
      { href: "/domains", label: "Domains", icon: Globe2 },
      { href: "/mailboxes", label: "Mailboxes", icon: Inbox },
      { href: "/aliases", label: "Aliases", icon: AtSign },
    ],
  },
  {
    title: "Mail",
    items: [
      { href: "/webmail", label: "Mail Workspace", icon: Mail },
    ],
  },
  {
    title: "Operate",
    items: [
      { href: "/admin", label: "Admin Console", icon: SlidersHorizontal },
      { href: "/operations", label: "Operations", icon: ShieldCheck },
      { href: "/billing", label: "Billing", icon: CreditCard },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
  {
    title: "Platform",
    items: [
      { href: "/superadmin", label: "Superadmin", icon: Crown },
    ],
  },
];
