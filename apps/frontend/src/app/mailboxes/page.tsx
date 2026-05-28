import { AppShell } from "@/components/AppShell";
import { MailboxesClient } from "@/components/MailboxesClient";
import { Domain, Mailbox } from "@/lib/platform-data";
import { apiGet, requireAuthToken } from "@/lib/server-api";
import { Plus } from "lucide-react";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function MailboxesPage() {
  if (!(await requireAuthToken())) {
    redirect("/login");
  }

  const [mailboxes, domains] = await Promise.all([
    apiGet<Mailbox[]>("/api/mailboxes"),
    apiGet<Domain[]>("/api/domains"),
  ]);

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

      <MailboxesClient initialMailboxes={mailboxes} domains={domains} />
    </AppShell>
  );
}
