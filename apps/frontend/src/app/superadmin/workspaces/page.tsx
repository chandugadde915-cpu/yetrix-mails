import { DataTable } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { RoleBasedLayout } from "@/components/RoleBasedLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDateTime } from "@/lib/platform-data";
import { apiGetSafe } from "@/lib/server-api";
import { Building2 } from "lucide-react";

export const dynamic = "force-dynamic";

interface WorkspaceInventory {
  id: string;
  name: string;
  status: string;
  created_at?: string;
  counts: { domains: number; mailboxes: number; aliases: number; users: number };
}

export default async function SuperAdminWorkspacesPage() {
  const workspaces = await apiGetSafe<WorkspaceInventory[]>("/api/workspaces", []);

  return (
    <RoleBasedLayout route="/superadmin/workspaces" permission="workspace.view" crumbs={[{ label: "Super Admin" }, { label: "Workspaces" }]}>
      <PageHeader title="Workspaces" description="All customer workspaces and tenant usage." />
      <DataTable
        rows={workspaces.data}
        getRowKey={(workspace) => workspace.id}
        empty={<EmptyState icon={Building2} title="No workspaces found" description="Customer signup will create the first workspace." />}
        columns={[
          { key: "name", header: "Workspace", searchText: (workspace) => workspace.name, render: (workspace) => workspace.name },
          { key: "status", header: "Status", render: (workspace) => <StatusBadge status={workspace.status} /> },
          { key: "domains", header: "Domains", render: (workspace) => workspace.counts.domains },
          { key: "mailboxes", header: "Mailboxes", render: (workspace) => workspace.counts.mailboxes },
          { key: "aliases", header: "Aliases", render: (workspace) => workspace.counts.aliases },
          { key: "users", header: "Users", render: (workspace) => workspace.counts.users },
          { key: "created", header: "Created", render: (workspace) => formatDateTime(workspace.created_at) },
        ]}
      />
    </RoleBasedLayout>
  );
}
