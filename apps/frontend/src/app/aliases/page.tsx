import { AliasesClient, AliasRow } from "@/components/AliasesClient";
import { AppShell } from "@/components/AppShell";
import { apiGet } from "@/lib/api";
import { getDummyData } from "@/lib/dummy-data";

export const dynamic = "force-dynamic";

export default async function AliasesPage() {
  const fallbackAliases: AliasRow[] = getDummyData().mailboxes.flatMap((mailbox) =>
    mailbox.aliases.map((alias, index) => ({
      id: `${mailbox.address}-${index}`,
      address: alias,
      goto: mailbox.address,
      status: "active",
    })),
  );
  const aliases = await apiGet("/api/aliases", fallbackAliases);

  return (
    <AppShell>
      <div className="topbar">
        <div className="title">
          <h1>Aliases</h1>
          <p>Create forwarding addresses and catch-all style routing through Mailcow.</p>
        </div>
      </div>
      <AliasesClient initialAliases={aliases} />
    </AppShell>
  );
}
