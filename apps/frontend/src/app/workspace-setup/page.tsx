import { AppShell } from "@/components/AppShell";
import { requirePageSession } from "@/lib/server-api";
import { AlertTriangle, LogIn, UserPlus } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function WorkspaceSetupPage() {
  await requirePageSession();

  return (
    <AppShell>
      <section className="workspace-missing">
        <div className="auth-mark">
          <AlertTriangle size={24} />
        </div>
        <h1>Workspace Needs Setup</h1>
        <p>
          Your session is valid, but the backend did not return a workspace for this user. Login
          again with a tenant owner account, or create a new workspace before opening dashboard
          pages.
        </p>
        <div className="launch-actions">
          <Link className="button" href="/login?session=expired">
            <LogIn size={18} />
            Login again
          </Link>
          <Link className="button secondary" href="/signup">
            <UserPlus size={18} />
            Create workspace
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
