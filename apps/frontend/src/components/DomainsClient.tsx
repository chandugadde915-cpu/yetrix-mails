"use client";

import { apiDelete, apiPost } from "@/lib/client-api";
import { Domain, domainHealth } from "@/lib/platform-data";
import { CheckCircle2, Clock3, Copy, Globe2, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function DomainsClient({ initialDomains }: { initialDomains: Domain[] }) {
  const router = useRouter();
  const [domains, setDomains] = useState(initialDomains);
  const [domain, setDomain] = useState("");
  const [message, setMessage] = useState("");
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

  async function deleteDomain(value: string) {
    if (!window.confirm(`Delete ${value}?`)) return;

    setMessage("");
    try {
      await apiDelete(`/api/domains/${encodeURIComponent(value)}`);
      setDomains((current) => current.filter((item) => item.domain !== value));
      setMessage(`${value} deleted.`);
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
            This view reads live hosted domains through your backend and checks MX, A, SPF, DKIM,
            and DMARC against public DNS.
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
                    {item.mailboxes ?? 0} mailboxes · Added {String(item.createdAt ?? "recently")}
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
                {(item.records ?? []).map((record) => (
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
                        <span className="mono">{record.value}</span>
                        <button
                          className="copy-button"
                          type="button"
                          title="Copy DNS value"
                          onClick={() => void copyRecord(record.value)}
                        >
                          <Copy size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="domain-actions">
                <button
                  className="button secondary"
                  onClick={() => startTransition(() => router.refresh())}
                >
                  <RefreshCw size={17} />
                  Refresh
                </button>
                <button className="button danger" onClick={() => void deleteDomain(item.domain)}>
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
            <h2>Add yetrixtechnologies.com or a customer domain</h2>
            <p>
              After you add a domain, this page shows live MX, A, SPF, DKIM, and DMARC status from
              public DNS.
            </p>
          </article>
        ) : null}
      </section>
    </>
  );
}
