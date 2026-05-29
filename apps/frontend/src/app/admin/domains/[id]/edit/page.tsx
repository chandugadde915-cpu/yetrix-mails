import { DomainDetailPanel } from "@/components/DomainFormClient";
import { PageHeader } from "@/components/PageHeader";
import { RoleBasedLayout } from "@/components/RoleBasedLayout";
import { Domain } from "@/lib/platform-data";
import { apiGetSafe } from "@/lib/server-api";
import { notFound } from "next/navigation";

export default async function AdminDomainEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const domains = await apiGetSafe<Domain[]>("/api/domains", []);
  const domain = domains.data.find((item) => item.domain === decodeURIComponent(id));
  if (!domain) notFound();

  return (
    <RoleBasedLayout route="/admin/domains" permission="domain.edit" crumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Domains", href: "/admin/domains" }, { label: "Edit" }]}>
      <PageHeader title="Edit domain" description="Use verify and DKIM actions from the domain list." />
      <DomainDetailPanel domain={domain} />
    </RoleBasedLayout>
  );
}
