import { AppShell } from "@/components/AppShell";
import {
  OperationResult,
  OperationsClient,
  OperationsSummary,
  RoutingData,
} from "@/components/OperationsClient";
import { PageHeader } from "@/components/PageHeader";
import { StatusNotice } from "@/components/StatusNotice";
import { apiGetSafe, requirePageRole, requirePageSession } from "@/lib/server-api";

export const dynamic = "force-dynamic";

export default async function OperationsPage() {
  await requirePageSession();
  await requirePageRole(["superadmin", "owner", "admin"]);

  const [summary, routing, quarantine, logs] = await Promise.all([
    apiGetSafe<OperationsSummary>("/api/operations/summary", {}),
    apiGetSafe<RoutingData>("/api/operations/routing", { domains: [], mailboxes: [], aliases: [] }),
    apiGetSafe<OperationResult | null>("/api/operations/quarantine", null),
    apiGetSafe<OperationResult[]>("/api/operations/logs", []),
  ]);

  return (
    <AppShell>
      <PageHeader
        title="Operations"
        description="Mail signing, routing, quarantine, and delivery visibility for the workspace."
      />
      <StatusNotice
        errors={[summary.error, routing.error, quarantine.error, logs.error]}
        message="Some operations data is temporarily unavailable."
      />
      <OperationsClient
        summary={summary.data}
        routing={routing.data}
        quarantine={quarantine.data}
        logs={logs.data}
      />
    </AppShell>
  );
}
