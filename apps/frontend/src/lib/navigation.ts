import {
  AtSign,
  CreditCard,
  Globe2,
  Inbox,
  LayoutDashboard,
  ListChecks,
  Mail,
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
