import { AppShell } from "@/components/AppShell";
import { DomainsClient } from "@/components/DomainsClient";
import { apiGet } from "@/lib/api";
import { getDummyData } from "@/lib/dummy-data";
import { RefreshCw } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DomainsPage() {
  const domains = await apiGet("/api/domains", getDummyData().domains);

  return (
    <AppShell>
      <div className="topbar">
        <div className="title">
          <h1>Domains</h1>
          <p>Add customer domains and verify mail DNS records.</p>
        </div>
        <button className="button">
          <RefreshCw size={18} />
          Check records
        </button>
      </div>

      <DomainsClient initialDomains={domains} />
    </AppShell>
  );
}
