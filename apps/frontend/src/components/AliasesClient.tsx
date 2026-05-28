"use client";

import { apiDelete, apiPost, apiPut } from "@/lib/client-api";
import { Plus, Power, Save, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export interface AliasRow {
  id: string;
  address: string;
  goto: string;
  status: string;
  active?: boolean;
}

export function AliasesClient({ initialAliases }: { initialAliases: AliasRow[] }) {
  const router = useRouter();
  const [aliases, setAliases] = useState(initialAliases);
  const [gotoDrafts, setGotoDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(initialAliases.map((alias) => [alias.id, alias.goto])),
  );
  const [form, setForm] = useState({ address: "", goto: "" });
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setAliases(initialAliases);
    setGotoDrafts(Object.fromEntries(initialAliases.map((alias) => [alias.id, alias.goto])));
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

  async function updateAlias(id: string) {
    try {
      const goto = gotoDrafts[id];
      await apiPut(`/api/aliases/${encodeURIComponent(id)}`, { goto });
      setAliases((current) =>
        current.map((alias) => (alias.id === id ? { ...alias, goto } : alias)),
      );
      setMessage("Alias updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update alias.");
    }
  }

  async function setActive(alias: AliasRow) {
    const nextActive = alias.status !== "active";
    try {
      await apiPut(`/api/aliases/${encodeURIComponent(alias.id)}`, { active: nextActive });
      setAliases((current) =>
        current.map((item) =>
          item.id === alias.id
            ? { ...item, status: nextActive ? "active" : "disabled", active: nextActive }
            : item,
        ),
      );
      setMessage(`Alias ${nextActive ? "enabled" : "disabled"}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update alias.");
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
                <td>
                  <input
                    aria-label={`Destination for ${alias.address}`}
                    className="alias-input"
                    value={gotoDrafts[alias.id] ?? alias.goto}
                    onChange={(event) =>
                      setGotoDrafts((current) => ({ ...current, [alias.id]: event.target.value }))
                    }
                  />
                </td>
                <td>
                  <span className={`badge ${alias.status === "active" ? "good" : "warn"}`}>
                    {alias.status}
                  </span>
                </td>
                <td>
                  <div className="table-actions">
                    <button
                      className="icon-button"
                      title="Save alias"
                      onClick={() => void updateAlias(alias.id)}
                    >
                      <Save size={16} />
                    </button>
                    <button
                      className="icon-button"
                      title={alias.status === "active" ? "Disable alias" : "Enable alias"}
                      onClick={() => void setActive(alias)}
                    >
                      <Power size={16} />
                    </button>
                    <button
                      className="icon-button danger-icon"
                      title="Delete alias"
                      onClick={() => void deleteAlias(alias.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
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
