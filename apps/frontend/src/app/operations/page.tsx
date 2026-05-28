import { AppShell } from "@/components/AppShell";
import {
  OperationResult,
  OperationsClient,
  OperationsSummary,
  RoutingData,
} from "@/components/OperationsClient";
import { apiGetSafe, requireAuthToken } from "@/lib/server-api";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function OperationsPage() {
  if (!(await requireAuthToken())) {
    redirect("/login");
  }

  const [summary, routing, quarantine, logs] = await Promise.all([
    apiGetSafe<OperationsSummary>("/api/operations/summary", {}),
    apiGetSafe<RoutingData>("/api/operations/routing", { domains: [], mailboxes: [], aliases: [] }),
    apiGetSafe<OperationResult | null>("/api/operations/quarantine", null),
    apiGetSafe<OperationResult[]>("/api/operations/logs", []),
  ]);

  return (
    <AppShell>
      <div className="topbar">
        <div className="title">
          <h1>Operations</h1>
          <p>Mail signing, routing, quarantine, and delivery visibility for the workspace.</p>
        </div>
      </div>
      {[summary.error, routing.error, quarantine.error, logs.error].filter(Boolean).length > 0 ? (
        <div className="notice warn-notice">Some operations data is temporarily unavailable.</div>
      ) : null}
      <OperationsClient
        summary={summary.data}
        routing={routing.data}
        quarantine={quarantine.data}
        logs={logs.data}
      />
    </AppShell>
  );
}
