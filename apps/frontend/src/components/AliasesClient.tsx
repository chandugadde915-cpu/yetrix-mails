"use client";

import { apiDelete, apiPost } from "@/lib/api";
import { Plus, Trash2 } from "lucide-react";
import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export interface AliasRow {
  id: string;
  address: string;
  goto: string;
  status: string;
}

export function AliasesClient({ initialAliases }: { initialAliases: AliasRow[] }) {
  const router = useRouter();
  const [aliases, setAliases] = useState(initialAliases);
  const [form, setForm] = useState({ address: "", goto: "" });
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  async function createAlias(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await apiPost("/api/aliases", { ...form, active: true });
    setMessage("Alias created.");
    setForm({ address: "", goto: "" });
    startTransition(() => router.refresh());
  }

  async function deleteAlias(id: string) {
    await apiDelete(`/api/aliases/${encodeURIComponent(id)}`);
    setAliases((current) => current.filter((alias) => alias.id !== id));
    setMessage("Alias deleted.");
  }

  return (
    <>
      <form className="mailbox-create" onSubmit={createAlias}>
        <input
          placeholder="sales@yetrixtechnologies.com"
          value={form.address}
          onChange={(event) => setForm({ ...form, address: event.target.value })}
          required
        />
        <input
          placeholder="admin@yetrixtechnologies.com"
          value={form.goto}
          onChange={(event) => setForm({ ...form, goto: event.target.value })}
          required
        />
        <button className="button" disabled={isPending}>
          <Plus size={18} />
          Create alias
        </button>
      </form>
      {message ? <div className="notice">{message}</div> : null}

      <section className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>Alias</th>
              <th>Destination</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {aliases.map((alias) => (
              <tr key={alias.id}>
                <td>{alias.address}</td>
                <td>{alias.goto}</td>
                <td>
                  <span className={`badge ${alias.status === "active" ? "good" : "warn"}`}>
                    {alias.status}
                  </span>
                </td>
                <td>
                  <button className="icon-button danger-icon" onClick={() => void deleteAlias(alias.id)}>
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
