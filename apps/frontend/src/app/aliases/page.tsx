import { AliasesClient, AliasRow } from "@/components/AliasesClient";
import { AppShell } from "@/components/AppShell";
import { apiGetSafe, requireAuthToken } from "@/lib/server-api";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AliasesPage() {
  if (!(await requireAuthToken())) {
    redirect("/login");
  }

  const aliases = await apiGetSafe<AliasRow[]>("/api/aliases", []);

  return (
    <AppShell>
      <div className="topbar">
        <div className="title">
          <h1>Aliases</h1>
          <p>Create forwarding addresses and catch-all style routing for each workspace.</p>
        </div>
      </div>
      {aliases.error ? (
        <div className="notice warn-notice">
          Alias data is temporarily unavailable. {aliases.error}
        </div>
      ) : null}
      <AliasesClient initialAliases={aliases.data} />
    </AppShell>
  );
}
