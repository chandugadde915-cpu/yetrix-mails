import { DomainDetailPanel } from "@/components/DomainFormClient";
import { PageHeader } from "@/components/PageHeader";
import { RoleBasedLayout } from "@/components/RoleBasedLayout";
import { Domain } from "@/lib/platform-data";
import { apiGetSafe } from "@/lib/server-api";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function AdminDomainViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const domains = await apiGetSafe<Domain[]>("/api/domains", []);
  const domain = domains.data.find((item) => item.domain === decodeURIComponent(id));
  if (!domain) notFound();

  return (
    <RoleBasedLayout route="/admin/domains" permission="domain.view" crumbs={[{ label: "Admin", href: "/admin/dashboard" }, { label: "Domains", href: "/admin/domains" }, { label: domain.domain }]}>
      <PageHeader title={domain.domain} description="DNS records and verification state." actions={<Link className="button" href={`/admin/domains/${encodeURIComponent(domain.domain)}/edit`}>Edit domain</Link>} />
      <DomainDetailPanel domain={domain} />
    </RoleBasedLayout>
  );
}
