"use client";

import { WorkspaceUser } from "@/components/UsersClient";
import { apiPost, apiPut } from "@/lib/client-api";
import { UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";

export function UserFormClient({
  user,
  returnPath,
  canCreateSuperadmin = false,
}: {
  user?: WorkspaceUser;
  returnPath: string;
  canCreateSuperadmin?: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    email: user?.email ?? "",
    name: user?.name ?? "",
    password: "",
    role: user?.role ?? "admin",
    status: user?.status ?? "active",
  });
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    try {
      if (user) {
        await apiPut(`/api/users/${user.id}`, {
          name: form.name,
          role: form.role,
          status: form.status,
          password: form.password || undefined,
        });
        startTransition(() => router.push(`${returnPath}/${user.id}`));
      } else {
        await apiPost("/api/users", form);
        startTransition(() => router.push(returnPath));
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save user.");
    }
  }

  return (
    <form className="resource-form" onSubmit={submit}>
      <label>
        Email
        <input
          disabled={Boolean(user)}
          required
          type="email"
          value={form.email}
          onChange={(event) => setForm({ ...form, email: event.target.value })}
        />
      </label>
      <label>
        Name
        <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
      </label>
      <label>
        {user ? "New password" : "Temporary password"}
        <input
          required={!user}
          minLength={10}
          type="password"
          value={form.password}
          onChange={(event) => setForm({ ...form, password: event.target.value })}
        />
      </label>
      <label>
        Role
        <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
          <option value="admin">Admin</option>
          <option value="support">Support</option>
          <option value="viewer">User</option>
          {canCreateSuperadmin ? <option value="superadmin">Super Admin</option> : null}
        </select>
      </label>
      <label>
        Status
        <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
          <option value="active">Active</option>
          <option value="disabled">Disabled</option>
        </select>
      </label>
      {message ? <div className="notice">{message}</div> : null}
      <button className="button" disabled={isPending}>
        <UserPlus size={18} />
        {user ? "Save user" : "Create user"}
      </button>
    </form>
  );
}

export function UserDetailPanel({ user }: { user: WorkspaceUser }) {
  return (
    <section className="panel section">
      <div className="resource-detail-grid">
        <div>
          <span>Name</span>
          <strong>{user.name ?? "User"}</strong>
        </div>
        <div>
          <span>Email</span>
          <strong>{user.email}</strong>
        </div>
        <div>
          <span>Role</span>
          <strong>{user.role}</strong>
        </div>
        <div>
          <span>Status</span>
          <strong>{user.status}</strong>
        </div>
      </div>
    </section>
  );
}
