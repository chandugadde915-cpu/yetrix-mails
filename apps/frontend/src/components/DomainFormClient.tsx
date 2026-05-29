"use client";

import { apiPost } from "@/lib/client-api";
import { Domain } from "@/lib/platform-data";
import { Globe2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";

export function DomainCreateForm({ returnPath }: { returnPath: string }) {
  const router = useRouter();
  const [domain, setDomain] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    try {
      const normalized = domain.trim().toLowerCase();
      await apiPost("/api/domains", { domain: normalized });
      setMessage("Domain added. DNS verification is ready.");
      startTransition(() => router.push(`${returnPath}/${encodeURIComponent(normalized)}`));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not add domain.");
    }
  }

  return (
    <form className="resource-form" onSubmit={submit}>
      <label>
        Domain name
        <input
          autoFocus
          required
          placeholder="company.com"
          value={domain}
          onChange={(event) => setDomain(event.target.value)}
        />
      </label>
      {message ? <div className="notice">{message}</div> : null}
      <button className="button" disabled={isPending || !domain.trim()}>
        <Globe2 size={18} />
        Add domain
      </button>
    </form>
  );
}

export function DomainDetailPanel({ domain }: { domain: Domain }) {
  return (
    <section className="panel section">
      <div className="resource-detail-grid">
        <div>
          <span>Domain</span>
          <strong>{domain.domain}</strong>
        </div>
        <div>
          <span>Status</span>
          <strong>{domain.status}</strong>
        </div>
        <div>
          <span>Mailboxes</span>
          <strong>{domain.mailboxes ?? 0}</strong>
        </div>
        <div>
          <span>Aliases</span>
          <strong>{domain.aliases ?? 0}</strong>
        </div>
      </div>
      <div className="dns-record-table">
        {(domain.records ?? []).map((record) => (
          <div key={`${record.type}-${record.name}`}>
            <span>{record.type}</span>
            <strong>{record.name}</strong>
            <code>{record.value}</code>
            <em>{record.status}</em>
          </div>
        ))}
      </div>
    </section>
  );
}
