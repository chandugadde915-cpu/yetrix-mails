"use client";

import { apiDelete, apiPost, apiPut } from "@/lib/client-api";
import { formatStorage, Mailbox, usagePercent } from "@/lib/dummy-data";
import { KeyRound, Plus, Power, Save, Trash2 } from "lucide-react";
import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function MailboxesClient({ initialMailboxes }: { initialMailboxes: Mailbox[] }) {
  const router = useRouter();
  const [mailboxes, setMailboxes] = useState(initialMailboxes);
  const [form, setForm] = useState({ email: "", name: "", password: "", quotaMb: 2048 });
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  async function createMailbox(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await apiPost("/api/mailboxes", form);
      setMessage("Mailbox created.");
      setForm({ email: "", name: "", password: "", quotaMb: 2048 });
      startTransition(() => router.refresh());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create mailbox.");
    }
  }

  async function updateQuota(email: string, quotaMb: number) {
    try {
      await apiPut(`/api/mailboxes/${encodeURIComponent(email)}`, { quotaMb });
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
      <form className="mailbox-create" onSubmit={createMailbox}>
        <input
          placeholder="user@yetrixtechnologies.com"
          value={form.email}
          onChange={(event) => setForm({ ...form, email: event.target.value })}
          required
        />
        <input
          placeholder="Display name"
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
        />
        <input
          placeholder="Password"
          type="password"
          value={form.password}
          onChange={(event) => setForm({ ...form, password: event.target.value })}
          minLength={10}
          required
        />
        <input
          min={128}
          max={102400}
          type="number"
          value={form.quotaMb}
          onChange={(event) => setForm({ ...form, quotaMb: Number(event.target.value) })}
        />
        <button className="button" disabled={isPending}>
          <Plus size={18} />
          Create
        </button>
      </form>
      {message ? <div className="notice">{message}</div> : null}

      <section className="panel">
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
                      onClick={() => void updateQuota(mailbox.address, mailbox.quotaMb)}
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
          </tbody>
        </table>
      </section>
    </>
  );
}
