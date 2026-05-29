import { DataTable } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { RoleBasedLayout } from "@/components/RoleBasedLayout";
import { formatDateTime } from "@/lib/platform-data";
import { apiGetSafe } from "@/lib/server-api";
import { ClipboardList } from "lucide-react";

export const dynamic = "force-dynamic";

interface AuditRow {
  id: string;
  action: string;
  target: string;
  actor?: string;
  createdAt: string;
}

export default async function SuperAdminAuditPage() {
  const audit = await apiGetSafe<AuditRow[]>("/api/audit", []);

  return (
    <RoleBasedLayout route="/superadmin/audit-logs" permission="audit.view" crumbs={[{ label: "Super Admin" }, { label: "Audit Logs" }]}>
      <PageHeader title="Audit Logs" description="Workspace, domain, mailbox, permission, and impersonation activity." />
      <DataTable
        rows={audit.data}
        getRowKey={(event) => event.id}
        empty={<EmptyState icon={ClipboardList} title="No audit logs yet" description="Important actions will appear here." />}
        columns={[
          { key: "action", header: "Action", searchText: (event) => event.action, render: (event) => event.action },
          { key: "resource", header: "Resource", searchText: (event) => event.target, render: (event) => event.target },
          { key: "actor", header: "Actor", searchText: (event) => event.actor ?? "", render: (event) => event.actor ?? "system" },
          { key: "created", header: "Created", render: (event) => formatDateTime(event.createdAt) },
        ]}
      />
    </RoleBasedLayout>
  );
}
