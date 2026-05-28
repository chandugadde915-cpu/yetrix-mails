import { AdminConsoleClient, OperationResult } from "@/components/AdminConsoleClient";
import { AliasRow } from "@/components/AliasesClient";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { StatusNotice } from "@/components/StatusNotice";
import { Domain, Mailbox } from "@/lib/platform-data";
import { apiGetSafe, requirePageSession } from "@/lib/server-api";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requirePageSession();

  const [domains, mailboxes, aliases, quarantine] = await Promise.all([
    apiGetSafe<Domain[]>("/api/domains", []),
    apiGetSafe<Mailbox[]>("/api/mailboxes", []),
    apiGetSafe<AliasRow[]>("/api/aliases", []),
    apiGetSafe<OperationResult | null>("/api/operations/quarantine", null),
  ]);

  return (
    <AppShell>
      <PageHeader
        title="Admin Console"
        description="Groups, shared inboxes, catch-all routing, DKIM, and quarantine controls."
      />
      <StatusNotice
        errors={[domains.error, mailboxes.error, aliases.error, quarantine.error]}
        message="Some admin data is temporarily unavailable."
      />
      <AdminConsoleClient
        domains={domains.data}
        mailboxes={mailboxes.data}
        aliases={aliases.data}
        quarantine={quarantine.data}
      />
    </AppShell>
  );
}
