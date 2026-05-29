import { DomainDetailPanel } from "@/components/DomainFormClient";
import { PageHeader } from "@/components/PageHeader";
import { RoleBasedLayout } from "@/components/RoleBasedLayout";
import { Domain } from "@/lib/platform-data";
import { apiGetSafe } from "@/lib/server-api";
import { notFound } from "next/navigation";

export default async function SuperAdminDomainEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const domains = await apiGetSafe<Domain[]>("/api/domains", []);
  const domain = domains.data.find((item) => item.domain === decodeURIComponent(id));
  if (!domain) notFound();

  return (
    <RoleBasedLayout route="/superadmin/domains" permission="domain.edit" crumbs={[{ label: "Super Admin", href: "/superadmin/dashboard" }, { label: "Domains", href: "/superadmin/domains" }, { label: "Edit" }]}>
      <PageHeader title="Edit domain" description="Domain DNS records are managed through verification actions." />
      <DomainDetailPanel domain={domain} />
    </RoleBasedLayout>
  );
}
