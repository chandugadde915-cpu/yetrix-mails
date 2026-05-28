import { AppShell } from "@/components/AppShell";
import { MailboxesClient } from "@/components/MailboxesClient";
import { PageHeader } from "@/components/PageHeader";
import { Domain, Mailbox } from "@/lib/platform-data";
import { apiGet, requirePageSession } from "@/lib/server-api";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MailboxesPage() {
  await requirePageSession();

  const [mailboxes, domains] = await Promise.all([
    apiGet<Mailbox[]>("/api/mailboxes"),
    apiGet<Domain[]>("/api/domains"),
  ]);

  return (
    <AppShell>
      <PageHeader
        title="Mailboxes"
        description="Create addresses, reset passwords, and manage storage quotas."
        actions={
          <a className="button" href="#mailbox-create">
            <Plus size={18} />
            New mailbox
          </a>
        }
      />

      <MailboxesClient initialMailboxes={mailboxes} domains={domains} />
    </AppShell>
  );
}
