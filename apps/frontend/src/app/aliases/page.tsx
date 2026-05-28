import { AliasesClient, AliasRow } from "@/components/AliasesClient";
import { AppShell } from "@/components/AppShell";
import { apiGet, requireAuthToken } from "@/lib/server-api";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AliasesPage() {
  if (!(await requireAuthToken())) {
    redirect("/login");
  }

  const aliases = await apiGet<AliasRow[]>("/api/aliases");

  return (
    <AppShell>
      <div className="topbar">
        <div className="title">
          <h1>Aliases</h1>
          <p>Create forwarding addresses and catch-all style routing for each workspace.</p>
        </div>
      </div>
      <AliasesClient initialAliases={aliases} />
    </AppShell>
  );
}
