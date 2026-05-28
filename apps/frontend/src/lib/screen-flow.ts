export interface ScreenAssignment {
  href: string;
  label: string;
  role: "Visitor" | "Workspace admin" | "Mailbox user" | "Operator" | "Superadmin";
}

export interface ProductFlowStage {
  id: string;
  title: string;
  outcome: string;
  screens: ScreenAssignment[];
  gate: "access" | "engine" | "domain" | "dns" | "mailbox" | "operations" | "platform";
}

export const productFlowStages: ProductFlowStage[] = [
  {
    id: "access",
    title: "Access",
    outcome: "User enters the SaaS workspace.",
    gate: "access",
    screens: [
      { href: "/", label: "Landing", role: "Visitor" },
      { href: "/signup", label: "Signup", role: "Visitor" },
      { href: "/login", label: "Login", role: "Visitor" },
    ],
  },
  {
    id: "workspace",
    title: "Workspace",
    outcome: "Admin sees launch status and setup tasks.",
    gate: "engine",
    screens: [
      { href: "/dashboard", label: "Dashboard", role: "Workspace admin" },
      { href: "/setup", label: "Product Flow", role: "Workspace admin" },
      { href: "/settings", label: "Settings", role: "Workspace admin" },
    ],
  },
  {
    id: "domain",
    title: "Domain",
    outcome: "Customer domain is added and DNS is verified.",
    gate: "dns",
    screens: [
      { href: "/domains", label: "Domains", role: "Workspace admin" },
      { href: "/domains#domain-create", label: "Add Domain", role: "Workspace admin" },
    ],
  },
  {
    id: "mailboxes",
    title: "Mailboxes",
    outcome: "Users and team addresses are provisioned.",
    gate: "mailbox",
    screens: [
      { href: "/mailboxes", label: "Mailboxes", role: "Workspace admin" },
      { href: "/aliases", label: "Aliases", role: "Workspace admin" },
    ],
  },
  {
    id: "mail",
    title: "Mail Workspace",
    outcome: "Mailbox user can sync, read, and send mail.",
    gate: "mailbox",
    screens: [{ href: "/webmail", label: "Webmail", role: "Mailbox user" }],
  },
  {
    id: "operate",
    title: "Operations",
    outcome: "Admins monitor routing, logs, billing, and account health.",
    gate: "operations",
    screens: [
      { href: "/operations", label: "Operations", role: "Operator" },
      { href: "/billing", label: "Billing", role: "Workspace admin" },
      { href: "/settings", label: "Users & Security", role: "Workspace admin" },
    ],
  },
  {
    id: "platform",
    title: "Platform Owner",
    outcome: "Superadmin controls all tenants and global mail inventory.",
    gate: "platform",
    screens: [{ href: "/superadmin", label: "Superadmin", role: "Superadmin" }],
  },
];
