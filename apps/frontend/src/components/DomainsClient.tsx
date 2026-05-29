"use client";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { apiDelete, apiPost } from "@/lib/client-api";
import { Domain, domainHealth, formatDateTime } from "@/lib/platform-data";
import { CheckCircle2, Clock3, Copy, Globe2, KeyRound, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface OperationResult {
  label?: string;
  supported?: boolean;
  data?: unknown;
  error?: string;
}

export function DomainsClient({ initialDomains }: { initialDomains: Domain[] }) {
  const router = useRouter();
  const [domains, setDomains] = useState(initialDomains);
  const [domain, setDomain] = useState("");
  const [message, setMessage] = useState("");
  const [deleteDialog, setDeleteDialog] = useState<{ domain: string; confirmation: string } | null>(null);
  const [generatedDkimRecords, setGeneratedDkimRecords] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const verifiedDomains = domains.filter((item) => domainHealth(item).healthy).length;
  const missingRecords = domains.flatMap((item) =>
    (item.records ?? []).filter((record) => record.status !== "verified"),
  ).length;

  useEffect(() => {
    setDomains(initialDomains);
  }, [initialDomains]);

  async function addDomain(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const normalized = domain.trim().toLowerCase();
    if (domains.some((item) => item.domain.toLowerCase() === normalized)) {
      setMessage("Domain already exists in this workspace.");
      return;
    }

    try {
      const result = await apiPost<{ existing?: boolean; message?: string }>("/api/domains", {
        domain: normalized,
      });
      setDomain("");
      setMessage(result.existing ? result.message ?? "Domain already linked." : "Domain added. DNS verification is ready.");
      startTransition(() => router.refresh());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not add domain.");
    }
  }

  async function confirmDeleteDomain() {
    if (!deleteDialog || deleteDialog.confirmation !== "DELETE") return;

    const value = deleteDialog.domain;
    setMessage("");
    try {
      await apiDelete(`/api/domains/${encodeURIComponent(value)}`);
      setDomains((current) => current.filter((item) => item.domain !== value));
      setMessage(`${value} deleted.`);
      setDeleteDialog(null);
      startTransition(() => router.refresh());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `Could not delete ${value}.`);
    }
  }

  async function copyRecord(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setMessage("DNS value copied.");
    } catch {
      setMessage("Could not copy DNS value.");
    }
  }

  async function generateDkim(value: string) {
    setMessage("");
    startTransition(async () => {
      try {
        const result = await apiPost<OperationResult>(`/api/operations/dkim/${encodeURIComponent(value)}`, {
          selector: "dkim",
          keySize: 2048,
        });
        const record = extractDkimRecord(result.data);
        if (record.startsWith("v=DKIM1")) {
          setGeneratedDkimRecords((current) => ({ ...current, [value]: record }));
        }
        setMessage(
          record.startsWith("v=DKIM1")
            ? `DKIM TXT value is ready for ${value}. Copy it from this page.`
            : `DKIM key requested for ${value}. Refresh records to copy the TXT value.`,
        );
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : `Could not generate DKIM for ${value}.`);
      }
    });
  }

  return (
    <>
      <section className="domain-command">
        <div className="domain-command-copy">
          <div className="eyebrow light">
            <ShieldCheck size={16} />
            DNS command center
          </div>
          <h2>Verify ownership, secure sending, and route mail from one place.</h2>
          <p>
            Add a domain, copy the required records, then refresh to confirm mail is ready.
          </p>
        </div>
        <div className="domain-scoreboard">
          <div>
            <strong>{verifiedDomains}</strong>
            <span>verified</span>
          </div>
          <div>
            <strong>{domains.length}</strong>
            <span>domains</span>
          </div>
          <div>
            <strong>{missingRecords}</strong>
            <span>pending records</span>
          </div>
        </div>
      </section>

      <form className="inline-create" id="domain-create" onSubmit={addDomain}>
        <input
          aria-label="Domain name"
          placeholder="example.com"
          value={domain}
          onChange={(event) => setDomain(event.target.value)}
          required
        />
        <button className="button" disabled={isPending || !domain}>
          <Globe2 size={18} />
          Add domain
        </button>
        {message ? <span>{message}</span> : null}
      </form>

      <section className="domain-board">
        {domains.map((item) => {
          const health = domainHealth(item);
          return (
            <article className="domain-card" key={item.domain}>
              <div className="domain-orbit" aria-hidden="true">
                <span className={health.healthy ? "online" : "pending"} />
                <span />
                <span />
              </div>

              <div className="domain-card-head">
                <div>
                  <div className="domain-kicker">
                    <Globe2 size={16} />
                    {health.healthy ? "Receiving mail" : "Waiting for DNS"}
                  </div>
                  <h2>{item.domain}</h2>
                  <p>
                    {item.mailboxes ?? 0} mailboxes · Added{" "}
                    {item.createdAt ? formatDateTime(item.createdAt) : "recently"}
                  </p>
                </div>
                <div className={`domain-status-pill ${health.healthy ? "good" : "warn"}`}>
                  {health.healthy ? <CheckCircle2 size={16} /> : <Clock3 size={16} />}
                  {health.healthy ? "Verified" : "Pending"}
                </div>
              </div>

              <div className="domain-route" aria-hidden="true">
                <span>Customer DNS</span>
                <div>
                  <i />
                  <i />
                  <i />
                </div>
                <span>Yetrix Mail</span>
              </div>

              <div className="dns-stack">
                {(item.records ?? []).map((record) => {
                  const generatedDkim = record.type === "DKIM" ? generatedDkimRecords[item.domain] : undefined;
                  const displayValue = generatedDkim ?? record.value;
                  const needsDkim = record.type === "DKIM" && !displayValue.startsWith("v=DKIM1");

                  return (
                    <div className="dns-record" key={`${item.domain}-${record.type}-${record.name}`}>
                      <div className={`dns-type ${record.status === "verified" ? "good" : "warn"}`}>
                        {record.type}
                      </div>
                      <div className="dns-record-body">
                        <div className="record-line">
                          <span className="mono">{record.name}</span>
                          <span
                            className={`record-state ${
                              record.status === "verified" ? "good" : "warn"
                            }`}
                          >
                            {record.status === "verified" ? "Verified" : "Missing"}
                          </span>
                        </div>
                        <div className="dns-value">
                          <span className="mono">
                            {needsDkim ? "Generate DKIM here, then add the TXT value to DNS." : displayValue}
                          </span>
                          {needsDkim ? (
                            <button
                              className="button secondary dns-inline-action"
                              disabled={isPending}
                              type="button"
                              onClick={() => void generateDkim(item.domain)}
                            >
                              <KeyRound size={15} />
                              Generate DKIM
                            </button>
                          ) : (
                            <button
                              className="copy-button"
                              type="button"
                              title="Copy DNS value"
                              onClick={() => void copyRecord(displayValue)}
                            >
                              <Copy size={15} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="domain-actions">
                <button
                  className="button secondary"
                  onClick={() => startTransition(() => router.refresh())}
                >
                  <RefreshCw size={17} />
                  Refresh
                </button>
                <button
                  className="button danger"
                  onClick={() => setDeleteDialog({ domain: item.domain, confirmation: "" })}
                >
                  <Trash2 size={17} />
                  Delete
                </button>
              </div>
            </article>
          );
        })}
        {domains.length === 0 ? (
          <article className="domain-card empty-card">
            <div className="domain-kicker">
              <Globe2 size={16} />
              Ready for your first domain
            </div>
            <h2>Add your company domain</h2>
            <p>
              After you add a domain, this page shows each required mail record and its current
              verification state.
            </p>
          </article>
        ) : null}
      </section>

      {deleteDialog ? (
        <ConfirmDialog
          danger
          title="Delete domain"
          description={`This removes ${deleteDialog.domain} from this workspace. Type DELETE to confirm.`}
          confirmLabel="Delete domain"
          disabled={isPending || deleteDialog.confirmation !== "DELETE"}
          onCancel={() => setDeleteDialog(null)}
          onConfirm={() => void confirmDeleteDomain()}
        >
          <label>
            Confirmation
            <input
              autoFocus
              value={deleteDialog.confirmation}
              onChange={(event) =>
                setDeleteDialog({ ...deleteDialog, confirmation: event.target.value })
              }
            />
          </label>
        </ConfirmDialog>
      ) : null}
    </>
  );
}

function extractDkimRecord(value: unknown) {
  const text = stringifyOperation(value);
  const match = text.match(/v=DKIM1[^"\\]+/i);
  return match?.[0]?.replace(/\\n/g, "").trim() ?? "";
}

function stringifyOperation(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}
