import { DomainTableClient } from "@/components/DomainTableClient";
import { PageHeader } from "@/components/PageHeader";
import { RoleBasedLayout } from "@/components/RoleBasedLayout";
import { Domain } from "@/lib/platform-data";
import { apiGetSafe } from "@/lib/server-api";

export const dynamic = "force-dynamic";

export default async function SuperAdminDomainsPage() {
  const domains = await apiGetSafe<Domain[]>("/api/domains", []);

  return (
    <RoleBasedLayout route="/superadmin/domains" permission="domain.view" crumbs={[{ label: "Super Admin" }, { label: "Domains" }]}>
      <PageHeader title="Global Domains" description="All hosted domains across every workspace." />
      <DomainTableClient domains={domains.data} basePath="/superadmin/domains" showWorkspace />
    </RoleBasedLayout>
  );
}
