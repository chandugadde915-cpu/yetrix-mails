import { AliasesClient, AliasRow } from "@/components/AliasesClient";
import { AppShell } from "@/components/AppShell";
import { apiGet, requireAuthToken } from "@/lib/server-api";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AliasesPage() {
  if (!(await requireAuthToken())) {
    redirect("/login");
  }

  let aliases: AliasRow[] = [];
  let loadError = "";

  try {
    aliases = await apiGet<AliasRow[]>("/api/aliases");
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Aliases could not be loaded.";
  }

  return (
    <AppShell>
      <div className="topbar">
        <div className="title">
          <h1>Aliases</h1>
          <p>Create forwarding addresses and catch-all style routing for each workspace.</p>
        </div>
      </div>
      {loadError ? (
        <div className="notice warn-notice">
          Alias data is temporarily unavailable. {loadError}
        </div>
      ) : null}
      <AliasesClient initialAliases={aliases} />
    </AppShell>
  );
}
