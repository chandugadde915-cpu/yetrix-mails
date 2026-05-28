import { AppShell } from "@/components/AppShell";
import { MailboxesClient } from "@/components/MailboxesClient";
import { Mailbox } from "@/lib/platform-data";
import { apiGet, requireAuthToken } from "@/lib/server-api";
import { Plus } from "lucide-react";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function MailboxesPage() {
  if (!(await requireAuthToken())) {
    redirect("/login");
  }

  const mailboxes = await apiGet<Mailbox[]>("/api/mailboxes");

  return (
    <AppShell>
      <div className="topbar">
        <div className="title">
          <h1>Mailboxes</h1>
          <p>Create addresses, reset passwords, and manage storage quotas.</p>
        </div>
        <a className="button" href="#mailbox-create">
          <Plus size={18} />
          New mailbox
        </a>
      </div>

      <MailboxesClient initialMailboxes={mailboxes} />
    </AppShell>
  );
}
