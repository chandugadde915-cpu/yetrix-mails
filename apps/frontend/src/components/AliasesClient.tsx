"use client";

import { apiDelete, apiPost } from "@/lib/client-api";
import { Plus, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useState, useTransition } from "react";
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

  useEffect(() => {
    setAliases(initialAliases);
  }, [initialAliases]);

  async function createAlias(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await apiPost("/api/aliases", { ...form, active: true });
      setMessage("Alias created.");
      setForm({ address: "", goto: "" });
      startTransition(() => router.refresh());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create alias.");
    }
  }

  async function deleteAlias(id: string) {
    if (!window.confirm("Delete this alias?")) return;

    try {
      await apiDelete(`/api/aliases/${encodeURIComponent(id)}`);
      setAliases((current) => current.filter((alias) => alias.id !== id));
      setMessage("Alias deleted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not delete alias.");
    }
  }

  return (
    <>
      <form className="mailbox-create" onSubmit={createAlias}>
        <input
          aria-label="Alias address"
          placeholder="sales@yetrixtechnologies.com"
          value={form.address}
          onChange={(event) => setForm({ ...form, address: event.target.value })}
          required
        />
        <input
          aria-label="Alias destination"
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
                  <button
                    className="icon-button danger-icon"
                    title="Delete alias"
                    onClick={() => void deleteAlias(alias.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {aliases.length === 0 ? (
              <tr>
                <td colSpan={4}>No aliases yet. Create a forwarding address above.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </>
  );
}
