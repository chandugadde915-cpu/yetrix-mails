import { AppShell } from "@/components/AppShell";
import { DomainsClient } from "@/components/DomainsClient";
import { Domain } from "@/lib/platform-data";
import { apiGet, requireAuthToken } from "@/lib/server-api";
import { RefreshCw } from "lucide-react";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DomainsPage() {
  if (!(await requireAuthToken())) {
    redirect("/login");
  }

  const domains = await apiGet<Domain[]>("/api/domains");

  return (
    <AppShell>
      <div className="topbar">
        <div className="title">
          <h1>Domains</h1>
          <p>Add customer domains and verify mail DNS records.</p>
        </div>
        <a className="button" href="/domains">
          <RefreshCw size={18} />
          Check records
        </a>
      </div>

      <DomainsClient initialDomains={domains} />
    </AppShell>
  );
}
