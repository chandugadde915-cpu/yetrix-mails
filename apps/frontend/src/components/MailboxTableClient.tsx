"use client";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DataTable } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { apiDelete, apiPost } from "@/lib/client-api";
import { formatDateTime, formatStorage, Mailbox } from "@/lib/platform-data";
import { Inbox, KeyRound, Power, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Dialog =
  | { type: "delete"; email: string; confirmation: string }
  | { type: "reset"; email: string; password: string }
  | { type: "disable"; email: string }
  | null;

export function MailboxTableClient({
  mailboxes,
  basePath,
  showWorkspace = false,
}: {
  mailboxes: Mailbox[];
  basePath: string;
  showWorkspace?: boolean;
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  async function resetPassword() {
    if (dialog?.type !== "reset") return;
    if (dialog.password.length < 10) {
      setMessage("Password must be at least 10 characters.");
      return;
    }
    try {
      await apiPost(`/api/mailboxes/${encodeURIComponent(dialog.email)}/password`, { password: dialog.password });
      setMessage(`Password reset for ${dialog.email}.`);
      setDialog(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not reset password.");
    }
  }

  async function disableMailbox() {
    if (dialog?.type !== "disable") return;
    try {
      await apiPost(`/api/mailboxes/${encodeURIComponent(dialog.email)}/disable`, {});
      setMessage(`${dialog.email} disabled.`);
      setDialog(null);
      startTransition(() => router.refresh());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not disable mailbox.");
    }
  }

  async function deleteMailbox() {
    if (dialog?.type !== "delete" || dialog.confirmation !== "DELETE") return;
    try {
      await apiDelete(`/api/mailboxes/${encodeURIComponent(dialog.email)}`);
      setMessage(`${dialog.email} deleted.`);
      setDialog(null);
      startTransition(() => router.refresh());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not delete mailbox.");
    }
  }

  return (
    <>
      {message ? <div className="notice">{message}</div> : null}
      <DataTable
        rows={mailboxes}
        getRowKey={(mailbox) => mailbox.address}
        empty={
          <EmptyState
            icon={Inbox}
            title="No mailboxes yet"
            description="Create a mailbox after DNS is verified."
            action={{ href: `${basePath}/create`, label: "Create mailbox" }}
          />
        }
        actions={
          <Link className="button" href={`${basePath}/create`}>
            Create mailbox
          </Link>
        }
        columns={[
          {
            key: "email",
            header: "Email address",
            searchText: (mailbox) => mailbox.address,
            render: (mailbox) => <Link href={`${basePath}/${encodeURIComponent(mailbox.address)}`}>{mailbox.address}</Link>,
          },
          { key: "domain", header: "Domain", searchText: (mailbox) => mailbox.domain, render: (mailbox) => mailbox.domain },
          ...(showWorkspace
            ? [{
                key: "workspace",
                header: "Workspace",
                searchText: () => "Workspace",
                render: () => "Workspace",
              }]
            : []),
          { key: "quota", header: "Quota", render: (mailbox) => formatStorage(mailbox.quotaMb) },
          { key: "used", header: "Storage used", render: (mailbox) => formatStorage(mailbox.usedMb ?? 0) },
          { key: "status", header: "Status", render: (mailbox) => <StatusBadge status={mailbox.status} /> },
          { key: "imap", header: "IMAP", render: (mailbox) => <StatusBadge status={mailbox.status === "active"} label={mailbox.status === "active" ? "OK" : "Disabled"} /> },
          { key: "smtp", header: "SMTP", render: (mailbox) => <StatusBadge status={mailbox.status === "active"} label={mailbox.status === "active" ? "OK" : "Disabled"} /> },
          { key: "lastLogin", header: "Last login", render: (mailbox) => formatDateTime(mailbox.lastLogin) },
          {
            key: "actions",
            header: "Actions",
            render: (mailbox) => (
              <div className="table-actions">
                <Link className="icon-button" href={`${basePath}/${encodeURIComponent(mailbox.address)}/edit`}>Edit</Link>
                <button className="icon-button" title="Reset password" onClick={() => setDialog({ type: "reset", email: mailbox.address, password: "" })}>
                  <KeyRound size={16} />
                </button>
                <button className="icon-button" disabled={isPending} title="Disable mailbox" onClick={() => setDialog({ type: "disable", email: mailbox.address })}>
                  <Power size={16} />
                </button>
                <button className="icon-button danger-icon" title="Delete mailbox" onClick={() => setDialog({ type: "delete", email: mailbox.address, confirmation: "" })}>
                  <Trash2 size={16} />
                </button>
              </div>
            ),
          },
        ]}
      />
      {dialog?.type === "reset" ? (
        <ConfirmDialog
          title="Reset mailbox password"
          description={`Set a new temporary password for ${dialog.email}.`}
          confirmLabel="Reset password"
          disabled={dialog.password.length < 10}
          onCancel={() => setDialog(null)}
          onConfirm={() => void resetPassword()}
        >
          <label>
            New password
            <input
              autoFocus
              type="password"
              value={dialog.password}
              onChange={(event) => setDialog({ ...dialog, password: event.target.value })}
            />
          </label>
        </ConfirmDialog>
      ) : null}
      {dialog?.type === "disable" ? (
        <ConfirmDialog
          danger
          title="Disable mailbox"
          description={`Disable sign-in and sending for ${dialog.email}?`}
          confirmLabel="Disable mailbox"
          onCancel={() => setDialog(null)}
          onConfirm={() => void disableMailbox()}
        />
      ) : null}
      {dialog?.type === "delete" ? (
        <ConfirmDialog
          danger
          title="Delete mailbox"
          description={`This removes ${dialog.email}. Type DELETE to confirm.`}
          confirmLabel="Delete mailbox"
          disabled={dialog.confirmation !== "DELETE"}
          onCancel={() => setDialog(null)}
          onConfirm={() => void deleteMailbox()}
        >
          <label>
            Confirmation
            <input
              autoFocus
              value={dialog.confirmation}
              onChange={(event) => setDialog({ ...dialog, confirmation: event.target.value })}
            />
          </label>
        </ConfirmDialog>
      ) : null}
    </>
  );
}
