import { DomainTableClient } from "@/components/DomainTableClient";
import { PageHeader } from "@/components/PageHeader";
import { RoleBasedLayout } from "@/components/RoleBasedLayout";
import { Domain } from "@/lib/platform-data";
import { apiGetSafe } from "@/lib/server-api";

export const dynamic = "force-dynamic";

export default async function AdminDomainsPage() {
  const domains = await apiGetSafe<Domain[]>("/api/domains", []);

  return (
    <RoleBasedLayout route="/admin/domains" permission="domain.view" crumbs={[{ label: "Admin" }, { label: "Domains" }]}>
      <PageHeader title="Domains" description="Manage workspace domains, DNS verification, DKIM, SPF, and DMARC." />
      <DomainTableClient domains={domains.data} basePath="/admin/domains" />
    </RoleBasedLayout>
  );
}
