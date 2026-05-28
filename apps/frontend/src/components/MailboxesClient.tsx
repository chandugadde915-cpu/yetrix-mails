"use client";

import { apiDelete, apiPost, apiPut } from "@/lib/client-api";
import { Domain, formatStorage, Mailbox, usagePercent } from "@/lib/platform-data";
import {
  HardDrive,
  KeyRound,
  Mail,
  Plus,
  Power,
  Save,
  ShieldCheck,
  Trash2,
  UserPlus,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function MailboxesClient({
  initialMailboxes,
  domains,
}: {
  initialMailboxes: Mailbox[];
  domains: Domain[];
}) {
  const router = useRouter();
  const domainOptions = useMemo(() => domains.map((domain) => domain.domain), [domains]);
  const [mailboxes, setMailboxes] = useState(initialMailboxes);
  const [quotaDrafts, setQuotaDrafts] = useState<Record<string, number>>(() =>
    Object.fromEntries(initialMailboxes.map((mailbox) => [mailbox.address, mailbox.quotaMb ?? 0])),
  );
  const [form, setForm] = useState({
    localPart: "",
    domain: domainOptions[0] ?? "yetrixtechnologies.com",
    name: "",
    password: "",
    quotaMb: 2048,
  });
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const activeCount = mailboxes.filter((mailbox) => mailbox.status === "active").length;
  const disabledCount = mailboxes.length - activeCount;
  const storageUsed = mailboxes.reduce((total, mailbox) => total + (mailbox.usedMb ?? 0), 0);
  const storageLimit = mailboxes.reduce((total, mailbox) => total + (mailbox.quotaMb ?? 0), 0);

  useEffect(() => {
    setMailboxes(initialMailboxes);
    setQuotaDrafts(
      Object.fromEntries(initialMailboxes.map((mailbox) => [mailbox.address, mailbox.quotaMb ?? 0])),
    );
  }, [initialMailboxes]);

  useEffect(() => {
    if (domainOptions.length > 0 && !domainOptions.includes(form.domain)) {
      setForm((current) => ({ ...current, domain: domainOptions[0] }));
    }
  }, [domainOptions, form.domain]);

  async function createMailbox(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = `${form.localPart.trim().toLowerCase()}@${form.domain}`;
    try {
      await apiPost("/api/mailboxes", {
        email,
        name: form.name,
        password: form.password,
        quotaMb: form.quotaMb,
      });
      setMessage("Mailbox created.");
      setForm((current) => ({ ...current, localPart: "", name: "", password: "", quotaMb: 2048 }));
      startTransition(() => router.refresh());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create mailbox.");
    }
  }

  async function updateQuota(email: string, quotaMb: number) {
    try {
      await apiPut(`/api/mailboxes/${encodeURIComponent(email)}`, { quotaMb });
      setMailboxes((current) =>
        current.map((mailbox) => (mailbox.address === email ? { ...mailbox, quotaMb } : mailbox)),
      );
      setMessage(`Quota updated for ${email}.`);
      startTransition(() => router.refresh());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `Could not update ${email}.`);
    }
  }

  async function resetPassword(email: string) {
    const password = window.prompt("New password, minimum 10 characters");
    if (!password) return;
    try {
      await apiPost(`/api/mailboxes/${encodeURIComponent(email)}/password`, { password });
      setMessage(`Password reset for ${email}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `Could not reset ${email}.`);
    }
  }

  async function setActive(email: string, active: boolean) {
    try {
      await apiPost(`/api/mailboxes/${encodeURIComponent(email)}/${active ? "enable" : "disable"}`, {});
      setMessage(`${email} ${active ? "enabled" : "disabled"}.`);
      startTransition(() => router.refresh());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `Could not update ${email}.`);
    }
  }

  async function deleteMailbox(email: string) {
    if (!window.confirm(`Delete ${email}?`)) return;

    try {
      await apiDelete(`/api/mailboxes/${encodeURIComponent(email)}`);
      setMailboxes((current) => current.filter((mailbox) => mailbox.address !== email));
      setMessage(`${email} deleted.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `Could not delete ${email}.`);
    }
  }

  return (
    <>
      <section className="mailbox-command">
        <div>
          <div className="eyebrow light">
            <UserPlus size={16} />
            User provisioning
          </div>
          <h2>Create real mailbox users, control access, and hand them a working webmail login.</h2>
          <p>
            Each mailbox is provisioned through your backend into the private mail engine, then
            becomes available in the Yetrix mail workspace and mobile mail apps.
          </p>
        </div>
        <div className="mailbox-lifecycle">
          <div className="lifecycle-step active">
            <span>01</span>
            <strong>Create</strong>
          </div>
          <div className="lifecycle-step">
            <span>02</span>
            <strong>Quota</strong>
          </div>
          <div className="lifecycle-step">
            <span>03</span>
            <strong>Access</strong>
          </div>
          <div className="lifecycle-step">
            <span>04</span>
            <strong>Webmail</strong>
          </div>
        </div>
        <div className="mailbox-stats">
          <div>
            <ShieldCheck size={18} />
            <span>Active</span>
            <strong>{activeCount}</strong>
          </div>
          <div>
            <Power size={18} />
            <span>Disabled</span>
            <strong>{disabledCount}</strong>
          </div>
          <div>
            <HardDrive size={18} />
            <span>Storage</span>
            <strong>
              {formatStorage(storageUsed)} / {formatStorage(storageLimit)}
            </strong>
          </div>
        </div>
      </section>

      <form className="mailbox-create" id="mailbox-create" onSubmit={createMailbox}>
        <input
          aria-label="Mailbox username"
          placeholder="user"
          value={form.localPart}
          onChange={(event) => setForm({ ...form, localPart: event.target.value })}
          pattern="^[a-zA-Z0-9._%+-]+$"
          required
        />
        <select
          aria-label="Mailbox domain"
          value={form.domain}
          onChange={(event) => setForm({ ...form, domain: event.target.value })}
          required
        >
          {domainOptions.map((domain) => (
            <option key={domain} value={domain}>
              @{domain}
            </option>
          ))}
          {domainOptions.length === 0 ? (
            <option value="yetrixtechnologies.com">@yetrixtechnologies.com</option>
          ) : null}
        </select>
        <input
          aria-label="Display name"
          placeholder="Display name"
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
        />
        <input
          aria-label="Mailbox password"
          placeholder="Password"
          type="password"
          value={form.password}
          onChange={(event) => setForm({ ...form, password: event.target.value })}
          minLength={10}
          required
        />
        <input
          aria-label="Mailbox quota in MB"
          min={128}
          max={102400}
          type="number"
          value={form.quotaMb}
          onChange={(event) => setForm({ ...form, quotaMb: Number(event.target.value) })}
        />
        <button className="button" disabled={isPending || domainOptions.length === 0}>
          <Plus size={18} />
          Create
        </button>
      </form>
      {domainOptions.length === 0 ? (
        <div className="notice warn-notice">Add a domain before creating production mailboxes.</div>
      ) : null}
      {message ? <div className="notice">{message}</div> : null}

      <section className="panel mailbox-table-panel">
        <div className="split-row">
          <div className="title">
            <h1>Mailbox Directory</h1>
            <p>Reset passwords, update quotas, disable users, or open the mail workspace.</p>
          </div>
          <span className="badge good">{mailboxes.length} total</span>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Name</th>
              <th>Quota</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {mailboxes.map((mailbox) => (
              <tr key={mailbox.address}>
                <td>{mailbox.address}</td>
                <td>{mailbox.name}</td>
                <td>
                  <div className="quota-cell">
                    <span>
                      {formatStorage(mailbox.usedMb ?? 0)} / {formatStorage(mailbox.quotaMb ?? 0)}
                    </span>
                    <div className="progress">
                      <span style={{ width: `${usagePercent(mailbox.usedMb ?? 0, mailbox.quotaMb ?? 1)}%` }} />
                    </div>
                    <input
                      aria-label={`Quota for ${mailbox.address}`}
                      className="quota-input"
                      min={128}
                      max={102400}
                      type="number"
                      value={quotaDrafts[mailbox.address] ?? mailbox.quotaMb ?? 0}
                      onChange={(event) =>
                        setQuotaDrafts((current) => ({
                          ...current,
                          [mailbox.address]: Number(event.target.value),
                        }))
                      }
                    />
                  </div>
                </td>
                <td>
                  <span className={`badge ${mailbox.status === "active" ? "good" : "warn"}`}>
                    {mailbox.status}
                  </span>
                </td>
                <td>
                  <div className="table-actions">
                    <button
                      className="icon-button"
                      title="Save quota"
                      onClick={() =>
                        void updateQuota(
                          mailbox.address,
                          quotaDrafts[mailbox.address] ?? mailbox.quotaMb ?? 0,
                        )
                      }
                    >
                      <Save size={16} />
                    </button>
                    <button
                      className="icon-button"
                      title="Reset password"
                      onClick={() => void resetPassword(mailbox.address)}
                    >
                      <KeyRound size={16} />
                    </button>
                    <button
                      className="icon-button"
                      title={mailbox.status === "active" ? "Disable" : "Enable"}
                      onClick={() => void setActive(mailbox.address, mailbox.status !== "active")}
                    >
                      <Power size={16} />
                    </button>
                    <a className="icon-button" href="/webmail" title="Open Yetrix mail workspace">
                      <Mail size={16} />
                    </a>
                    <button
                      className="icon-button danger-icon"
                      title="Delete"
                      onClick={() => void deleteMailbox(mailbox.address)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {mailboxes.length === 0 ? (
              <tr>
                <td colSpan={5}>No mailboxes yet. Create the first address above.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </>
  );
}
