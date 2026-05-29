import { DomainCreateForm } from "@/components/DomainFormClient";
import { PageHeader } from "@/components/PageHeader";
import { RoleBasedLayout } from "@/components/RoleBasedLayout";

export default function AdminDomainCreatePage() {
  return (
    <RoleBasedLayout route="/admin/domains/create" permission="domain.create" crumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Domains", href: "/admin/domains" }, { label: "Create" }]}>
      <PageHeader title="Add domain" description="Start domain ownership and DNS verification." />
      <DomainCreateForm returnPath="/admin/domains" />
    </RoleBasedLayout>
  );
}
