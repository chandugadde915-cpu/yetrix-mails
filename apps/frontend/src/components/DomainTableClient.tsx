"use client";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DataTable } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { apiDelete, apiPost } from "@/lib/client-api";
import { Domain, domainHealth, formatDateTime } from "@/lib/platform-data";
import { Globe2, KeyRound, RefreshCw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function DomainTableClient({
  domains,
  basePath,
  showWorkspace = false,
}: {
  domains: Domain[];
  basePath: string;
  showWorkspace?: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [deleteDialog, setDeleteDialog] = useState<{ domain: string; confirmation: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  async function verify(domain: string) {
    setMessage("");
    try {
      await apiPost(`/api/domains/${encodeURIComponent(domain)}/check-dns`, {});
      setMessage(`${domain} DNS check completed.`);
      startTransition(() => router.refresh());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not verify DNS.");
    }
  }

  async function generateDkim(domain: string) {
    setMessage("");
    try {
      await apiPost(`/api/operations/dkim/${encodeURIComponent(domain)}`, {
        selector: "dkim",
        keySize: 2048,
      });
      setMessage(`${domain} DKIM generation requested.`);
      startTransition(() => router.refresh());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not generate DKIM.");
    }
  }

  async function deleteDomain() {
    if (!deleteDialog || deleteDialog.confirmation !== "DELETE") return;
    try {
      await apiDelete(`/api/domains/${encodeURIComponent(deleteDialog.domain)}`);
      setMessage(`${deleteDialog.domain} deleted.`);
      setDeleteDialog(null);
      startTransition(() => router.refresh());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not delete domain.");
    }
  }

  return (
    <>
      {message ? <div className="notice">{message}</div> : null}
      <DataTable
        rows={domains}
        getRowKey={(domain) => domain.domain}
        empty={
          <EmptyState
            icon={Globe2}
            title="No domains yet"
            description="Add a domain to start DNS verification and mailbox hosting."
            action={{ href: `${basePath}/create`, label: "Add domain" }}
          />
        }
        actions={
          <Link className="button" href={`${basePath}/create`}>
            Add domain
          </Link>
        }
        columns={[
          {
            key: "domain",
            header: "Domain",
            searchText: (domain) => domain.domain,
            render: (domain) => <Link href={`${basePath}/${encodeURIComponent(domain.domain)}`}>{domain.domain}</Link>,
          },
          ...(showWorkspace
            ? [{
                key: "workspace",
                header: "Workspace",
                searchText: () => "Workspace",
                render: () => "Workspace",
              }]
            : []),
          {
            key: "dns",
            header: "DNS",
            render: (domain) => <StatusBadge status={domainHealth(domain).healthy} label={domainHealth(domain).label} />,
          },
          {
            key: "dkim",
            header: "DKIM",
            render: (domain) => <StatusBadge status={recordStatus(domain, "DKIM")} />,
          },
          {
            key: "spf",
            header: "SPF",
            render: (domain) => <StatusBadge status={recordStatus(domain, "SPF")} />,
          },
          {
            key: "dmarc",
            header: "DMARC",
            render: (domain) => <StatusBadge status={recordStatus(domain, "DMARC")} />,
          },
          {
            key: "mailboxes",
            header: "Mailboxes",
            render: (domain) => domain.mailboxes ?? 0,
          },
          {
            key: "created",
            header: "Created",
            render: (domain) => formatDateTime(domain.createdAt),
          },
          {
            key: "actions",
            header: "Actions",
            render: (domain) => (
              <div className="table-actions">
                <Link className="icon-button" title="Edit domain" href={`${basePath}/${encodeURIComponent(domain.domain)}/edit`}>
                  Edit
                </Link>
                <button className="icon-button" disabled={isPending} title="Verify DNS" onClick={() => void verify(domain.domain)}>
                  <RefreshCw size={16} />
                </button>
                <button className="icon-button" disabled={isPending} title="Generate DKIM" onClick={() => void generateDkim(domain.domain)}>
                  <KeyRound size={16} />
                </button>
                <button className="icon-button danger-icon" title="Delete domain" onClick={() => setDeleteDialog({ domain: domain.domain, confirmation: "" })}>
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
          title="Delete domain"
          description={`This removes ${deleteDialog.domain}. Type DELETE to confirm.`}
          confirmLabel="Delete domain"
          disabled={deleteDialog.confirmation !== "DELETE"}
          onCancel={() => setDeleteDialog(null)}
          onConfirm={() => void deleteDomain()}
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

function recordStatus(domain: Domain, type: string) {
  return domain.records?.find((record) => record.type === type)?.status === "verified";
}
