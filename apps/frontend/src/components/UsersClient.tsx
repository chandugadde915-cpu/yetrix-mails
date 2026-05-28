"use client";

import { apiDelete, apiPost, apiPut } from "@/lib/client-api";
import { Plus, Save, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export interface WorkspaceUser {
  id: string;
  workspace_id?: string;
  workspace_name?: string;
  email: string;
  name: string | null;
  role: string;
  status: string;
  created_at?: string;
  createdAt?: string;
}

export function UsersClient({ initialUsers }: { initialUsers: WorkspaceUser[] }) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [form, setForm] = useState({ email: "", name: "", password: "", role: "admin" });
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setUsers(initialUsers);
  }, [initialUsers]);

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    try {
      await apiPost("/api/users", form);
      setForm({ email: "", name: "", password: "", role: "admin" });
      setMessage("User created.");
      startTransition(() => router.refresh());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create user.");
    }
  }

  async function updateStatus(user: WorkspaceUser, status: string) {
    setMessage("");
    try {
      await apiPut(`/api/users/${user.id}`, { status });
      setUsers((current) =>
        current.map((item) => (item.id === user.id ? { ...item, status } : item)),
      );
      setMessage("User updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update user.");
    }
  }

  async function deleteUser(user: WorkspaceUser) {
    if (!window.confirm(`Delete ${user.email}?`)) return;
    setMessage("");
    try {
      await apiDelete(`/api/users/${user.id}`);
      setUsers((current) => current.filter((item) => item.id !== user.id));
      setMessage("User deleted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not delete user.");
    }
  }

  return (
    <>
      <form className="mailbox-create" onSubmit={createUser}>
        <input
          aria-label="User email"
          type="email"
          placeholder="admin@customer.com"
          value={form.email}
          onChange={(event) => setForm({ ...form, email: event.target.value })}
          required
        />
        <input
          aria-label="User name"
          placeholder="Full name"
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          required
        />
        <input
          aria-label="Temporary password"
          type="password"
          minLength={10}
          placeholder="Temporary password"
          value={form.password}
          onChange={(event) => setForm({ ...form, password: event.target.value })}
          required
        />
        <select
          aria-label="User role"
          value={form.role}
          onChange={(event) => setForm({ ...form, role: event.target.value })}
        >
          <option value="admin">Admin</option>
          <option value="superadmin">Superadmin</option>
          <option value="owner">Owner</option>
          <option value="support">Support</option>
          <option value="viewer">Viewer</option>
        </select>
        <button className="button" disabled={isPending}>
          <Plus size={18} />
          Add user
        </button>
      </form>
      {message ? <div className="notice">{message}</div> : null}

      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Workspace</th>
            <th>Role</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.name ?? "User"}</td>
              <td>{user.email}</td>
              <td>{user.workspace_name ?? "Current workspace"}</td>
              <td>{user.role}</td>
              <td>
                <span className={`badge ${user.status === "active" ? "good" : "warn"}`}>
                  {user.status}
                </span>
              </td>
              <td>
                <div className="table-actions">
                  <button
                    className="icon-button"
                    title={user.status === "active" ? "Disable user" : "Enable user"}
                    onClick={() => void updateStatus(user, user.status === "active" ? "disabled" : "active")}
                  >
                    <Save size={16} />
                  </button>
                  <button
                    className="icon-button danger-icon"
                    title="Delete user"
                    onClick={() => void deleteUser(user)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {users.length === 0 ? (
            <tr>
              <td colSpan={6}>No users yet.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </>
  );
}
