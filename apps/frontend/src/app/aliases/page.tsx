import { AliasesClient, AliasRow } from "@/components/AliasesClient";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { StatusNotice } from "@/components/StatusNotice";
import { apiGetSafe, requirePageSession } from "@/lib/server-api";

export const dynamic = "force-dynamic";

export default async function AliasesPage() {
  await requirePageSession();

  const aliases = await apiGetSafe<AliasRow[]>("/api/aliases", []);

  return (
    <AppShell>
      <PageHeader
        title="Aliases"
        description="Create forwarding addresses and catch-all style routing for each workspace."
      />
      <StatusNotice
        errors={[aliases.error]}
        message="Alias data is temporarily unavailable."
      />
      <AliasesClient initialAliases={aliases.data} />
    </AppShell>
  );
}
