import { AppShell } from "@/components/AppShell";
import { MailboxesClient } from "@/components/MailboxesClient";
import { apiGet } from "@/lib/api";
import { getDummyData } from "@/lib/dummy-data";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MailboxesPage() {
  const mailboxes = await apiGet("/api/mailboxes", getDummyData().mailboxes);

  return (
    <AppShell>
      <div className="topbar">
        <div className="title">
          <h1>Mailboxes</h1>
          <p>Create addresses, reset passwords, and manage storage quotas.</p>
        </div>
        <button className="button">
          <Plus size={18} />
          New mailbox
        </button>
      </div>

      <MailboxesClient initialMailboxes={mailboxes} />
    </AppShell>
  );
}
