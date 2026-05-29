import { DomainDetailPanel } from "@/components/DomainFormClient";
import { PageHeader } from "@/components/PageHeader";
import { RoleBasedLayout } from "@/components/RoleBasedLayout";
import { Domain } from "@/lib/platform-data";
import { apiGetSafe } from "@/lib/server-api";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function SuperAdminDomainViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const domains = await apiGetSafe<Domain[]>("/api/domains", []);
  const domain = domains.data.find((item) => item.domain === decodeURIComponent(id));
  if (!domain) notFound();

  return (
    <RoleBasedLayout route="/superadmin/domains" permission="domain.view" crumbs={[{ label: "Super Admin", href: "/superadmin/dashboard" }, { label: "Domains", href: "/superadmin/domains" }, { label: domain.domain }]}>
      <PageHeader title={domain.domain} description="DNS, DKIM, SPF, DMARC, and mailbox readiness." actions={<Link className="button" href={`/superadmin/domains/${encodeURIComponent(domain.domain)}/edit`}>Edit domain</Link>} />
      <DomainDetailPanel domain={domain} />
    </RoleBasedLayout>
  );
}
