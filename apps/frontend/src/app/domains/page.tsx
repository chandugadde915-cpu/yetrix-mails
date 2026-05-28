import { AppShell } from "@/components/AppShell";
import { DomainsClient } from "@/components/DomainsClient";
import { PageHeader } from "@/components/PageHeader";
import { Domain } from "@/lib/platform-data";
import { apiGet, requirePageSession } from "@/lib/server-api";
import { RefreshCw } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DomainsPage() {
  await requirePageSession();

  const domains = await apiGet<Domain[]>("/api/domains");

  return (
    <AppShell>
      <PageHeader
        title="Domains"
        description="Add customer domains and verify mail DNS records."
        actions={
          <a className="button" href="/domains">
            <RefreshCw size={18} />
            Check records
          </a>
        }
      />

      <DomainsClient initialDomains={domains} />
    </AppShell>
  );
}
