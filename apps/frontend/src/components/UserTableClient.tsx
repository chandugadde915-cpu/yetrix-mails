"use client";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DataTable } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { WorkspaceUser } from "@/components/UsersClient";
import { apiDelete, apiPut } from "@/lib/client-api";
import { formatDateTime } from "@/lib/platform-data";
import { Trash2, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function UserTableClient({
  users,
  basePath,
  currentRole,
  adminsOnly = false,
}: {
  users: WorkspaceUser[];
  basePath: string;
  currentRole?: string;
  adminsOnly?: boolean;
}) {
  const router = useRouter();
  const [deleteDialog, setDeleteDialog] = useState<{ user: WorkspaceUser; confirmation: string } | null>(null);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const visibleUsers = users.filter((user) => {
    if (adminsOnly) return ["superadmin", "owner", "admin", "support"].includes(user.role);
    if (currentRole !== "superadmin") return user.role !== "superadmin";
    return true;
  });

  async function updateStatus(user: WorkspaceUser) {
    try {
      await apiPut(`/api/users/${user.id}`, { status: user.status === "active" ? "disabled" : "active" });
      setMessage("User updated.");
      startTransition(() => router.refresh());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update user.");
    }
  }

  async function deleteUser() {
    if (!deleteDialog || deleteDialog.confirmation !== "DELETE") return;
    try {
      await apiDelete(`/api/users/${deleteDialog.user.id}`);
      setMessage("User deleted.");
      setDeleteDialog(null);
      startTransition(() => router.refresh());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not delete user.");
    }
  }

  return (
    <>
      {message ? <div className="notice">{message}</div> : null}
      <DataTable
        rows={visibleUsers}
        getRowKey={(user) => user.id}
        empty={<EmptyState icon={Users} title="No users yet" description="Invite an admin or workspace user." action={{ href: `${basePath}/create`, label: "Create user" }} />}
        actions={<Link className="button" href={`${basePath}/create`}>Create user</Link>}
        columns={[
          { key: "name", header: "Name", searchText: (user) => user.name ?? "", render: (user) => <Link href={`${basePath}/${user.id}`}>{user.name ?? "User"}</Link> },
          { key: "email", header: "Email", searchText: (user) => user.email, render: (user) => user.email },
          { key: "workspace", header: "Workspace", searchText: (user) => user.workspace_name ?? "", render: (user) => user.workspace_name ?? "Current workspace" },
          { key: "role", header: "Role", searchText: (user) => user.role, render: (user) => formatRole(user.role) },
          { key: "status", header: "Status", render: (user) => <StatusBadge status={user.status} /> },
          { key: "created", header: "Created", render: (user) => formatDateTime(user.created_at ?? user.createdAt) },
          {
            key: "actions",
            header: "Actions",
            render: (user) => (
              <div className="table-actions">
                <Link className="icon-button" href={`${basePath}/${user.id}/edit`}>Edit</Link>
                <button className="icon-button" disabled={isPending} onClick={() => void updateStatus(user)}>
                  {user.status === "active" ? "Disable" : "Enable"}
                </button>
                <button className="icon-button danger-icon" onClick={() => setDeleteDialog({ user, confirmation: "" })}>
                  <Trash2 size={16} />
                </button>
              </div>
            ),
          },
        ]}
      />
      {deleteDialog ? (
        <ConfirmDialog
          danger
          title="Delete user"
          description={`This removes ${deleteDialog.user.email}. Type DELETE to confirm.`}
          confirmLabel="Delete user"
          disabled={deleteDialog.confirmation !== "DELETE"}
          onCancel={() => setDeleteDialog(null)}
          onConfirm={() => void deleteUser()}
        >
          <label>
            Confirmation
            <input
              autoFocus
              value={deleteDialog.confirmation}
              onChange={(event) => setDeleteDialog({ ...deleteDialog, confirmation: event.target.value })}
            />
          </label>
        </ConfirmDialog>
      ) : null}
    </>
  );
}

function formatRole(role: string) {
  if (role === "owner") return "Admin";
  return role
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}
