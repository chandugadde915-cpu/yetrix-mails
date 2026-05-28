"use client";

import { apiDelete, apiPost } from "@/lib/client-api";
import { Domain } from "@/lib/dummy-data";
import { CheckCircle2, Clock3, Copy, Globe2, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function DomainsClient({ initialDomains }: { initialDomains: Domain[] }) {
  const router = useRouter();
  const [domains, setDomains] = useState(initialDomains);
  const [domain, setDomain] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const verifiedDomains = domains.filter((item) => item.status === "active").length;
  const missingRecords = domains.flatMap((item) =>
    item.records.filter((record) => record.status !== "verified"),
  ).length;

  async function addDomain(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    try {
      await apiPost("/api/domains", { domain });
      setDomain("");
      setMessage("Domain added. DNS verification is ready.");
      startTransition(() => router.refresh());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not add domain.");
    }
  }

  async function deleteDomain(value: string) {
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
            This view reads live Mailcow domains through your backend and checks MX, SPF, DKIM,
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

      <form className="inline-create" onSubmit={addDomain}>
        <input
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
        {domains.map((item) => (
          <article className="domain-card" key={item.domain}>
            <div className="domain-orbit" aria-hidden="true">
              <span className={item.status === "active" ? "online" : "pending"} />
              <span />
              <span />
            </div>

            <div className="domain-card-head">
              <div>
                <div className="domain-kicker">
                  <Globe2 size={16} />
                  {item.status === "active" ? "Receiving mail" : "Waiting for DNS"}
                </div>
                <h2>{item.domain}</h2>
                <p>
                  {item.mailboxes ?? 0} mailboxes · Added {String(item.createdAt ?? "recently")}
                </p>
              </div>
              <div className={`domain-status-pill ${item.status === "active" ? "good" : "warn"}`}>
                {item.status === "active" ? <CheckCircle2 size={16} /> : <Clock3 size={16} />}
                {item.status === "active" ? "Verified" : "Pending"}
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
              {item.records.map((record) => (
                <div className="dns-record" key={`${item.domain}-${record.type}-${record.name}`}>
                  <div className={`dns-type ${record.status === "verified" ? "good" : "warn"}`}>
                    {record.type}
                  </div>
                  <div className="dns-record-body">
                    <div className="record-line">
                      <span className="mono">{record.name}</span>
                      <span
                        className={`record-state ${record.status === "verified" ? "good" : "warn"}`}
                      >
                        {record.status === "verified" ? "Verified" : "Placeholder"}
                      </span>
                    </div>
                    <div className="dns-value">
                      <span className="mono">{record.value}</span>
                      <Copy size={15} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="domain-actions">
                <button className="button secondary" onClick={() => startTransition(() => router.refresh())}>
                <RefreshCw size={17} />
                Refresh
              </button>
              <button className="button danger" onClick={() => void deleteDomain(item.domain)}>
                <Trash2 size={17} />
                Delete
              </button>
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
