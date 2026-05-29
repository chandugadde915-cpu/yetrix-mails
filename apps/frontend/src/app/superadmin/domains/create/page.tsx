import { DomainCreateForm } from "@/components/DomainFormClient";
import { PageHeader } from "@/components/PageHeader";
import { RoleBasedLayout } from "@/components/RoleBasedLayout";

export default function CreateSuperAdminDomainPage() {
  return (
    <RoleBasedLayout route="/superadmin/domains/create" permission="domain.create" crumbs={[{ label: "Super Admin", href: "/superadmin/dashboard" }, { label: "Domains", href: "/superadmin/domains" }, { label: "Create" }]}>
      <PageHeader title="Add domain" description="Create or link a customer domain in the mail engine." />
      <DomainCreateForm returnPath="/superadmin/domains" />
    </RoleBasedLayout>
  );
}
