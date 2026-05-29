"use client";

import { apiPost, apiPut } from "@/lib/client-api";
import { Domain, domainHealth, Mailbox } from "@/lib/platform-data";
import { Inbox } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState, useTransition } from "react";

export function MailboxFormClient({
  domains,
  mailbox,
  returnPath,
}: {
  domains: Domain[];
  mailbox?: Mailbox;
  returnPath: string;
}) {
  const router = useRouter();
  const verifiedDomains = useMemo(
    () => domains.filter((domain) => domainHealth(domain).healthy).map((domain) => domain.domain),
    [domains],
  );
  const [form, setForm] = useState({
    localPart: mailbox?.address.split("@")[0] ?? "",
    domain: mailbox?.domain ?? verifiedDomains[0] ?? domains[0]?.domain ?? "",
    name: mailbox?.name ?? "",
    password: "",
    quotaMb: mailbox?.quotaMb ?? 5120,
    active: mailbox?.status !== "disabled",
  });
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const email = `${form.localPart.trim().toLowerCase()}@${form.domain}`;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (form.quotaMb < 1024) {
      setMessage("Mailbox quota must be at least 1 GB.");
      return;
    }

    try {
      if (mailbox) {
        await apiPut(`/api/mailboxes/${encodeURIComponent(mailbox.address)}`, {
          name: form.name,
          quotaMb: form.quotaMb,
          active: form.active,
        });
      } else {
        await apiPost("/api/mailboxes", {
          email,
          name: form.name || form.localPart,
          password: form.password,
          quotaMb: form.quotaMb,
          active: form.active,
        });
      }
      startTransition(() => router.push(`${returnPath}/${encodeURIComponent(mailbox?.address ?? email)}`));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save mailbox.");
    }
  }

  return (
    <form className="resource-form" onSubmit={submit}>
      <label>
        Email name
        <input
          disabled={Boolean(mailbox)}
          required
          value={form.localPart}
          onChange={(event) => setForm({ ...form, localPart: event.target.value })}
        />
      </label>
      <label>
        Domain
        <select
          disabled={Boolean(mailbox)}
          value={form.domain}
          onChange={(event) => setForm({ ...form, domain: event.target.value })}
        >
          {domains.map((domain) => (
            <option key={domain.domain} value={domain.domain}>
              {domain.domain}
            </option>
          ))}
        </select>
      </label>
      <label>
        Display name
        <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
      </label>
      {!mailbox ? (
        <label>
          Temporary password
          <input
            required
            minLength={10}
            type="password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
          />
        </label>
      ) : null}
      <label>
        Quota MB
        <input
          min={1024}
          type="number"
          value={form.quotaMb}
          onChange={(event) => setForm({ ...form, quotaMb: Number(event.target.value) })}
        />
      </label>
      <label className="check-row">
        <input
          type="checkbox"
          checked={form.active}
          onChange={(event) => setForm({ ...form, active: event.target.checked })}
        />
        Enable mailbox
      </label>
      {message ? <div className="notice">{message}</div> : null}
      <button className="button" disabled={isPending}>
        <Inbox size={18} />
        {mailbox ? "Save mailbox" : "Create mailbox"}
      </button>
    </form>
  );
}

export function MailboxDetailPanel({ mailbox }: { mailbox: Mailbox }) {
  return (
    <section className="panel section">
      <div className="resource-detail-grid">
        <div>
          <span>Email</span>
          <strong>{mailbox.address}</strong>
        </div>
        <div>
          <span>Domain</span>
          <strong>{mailbox.domain}</strong>
        </div>
        <div>
          <span>Status</span>
          <strong>{mailbox.status}</strong>
        </div>
        <div>
          <span>Quota</span>
          <strong>{mailbox.quotaMb} MB</strong>
        </div>
      </div>
    </section>
  );
}
