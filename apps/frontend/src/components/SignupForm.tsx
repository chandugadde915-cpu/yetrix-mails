"use client";

import { ArrowRight, Building2, Mail } from "lucide-react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function SignupForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    workspaceName: "",
    name: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = (await response.json()) as { success?: boolean; error?: string };
      if (!response.ok || payload.success === false) {
        throw new Error(payload.error ?? "Signup failed");
      }
      router.push("/setup");
      router.refresh();
    } catch (signupError) {
      setError(signupError instanceof Error ? signupError.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-art" aria-hidden="true">
        <div className="auth-brand">Yetrix</div>
        <div className="mail-stage small">
          <span />
          <span />
          <span />
        </div>
        <div className="mail-stage large">
          <span />
          <span />
          <span />
        </div>
      </section>
      <section className="auth-panel" aria-label="Workspace signup">
        <div className="auth-mark">
          <Building2 size={22} />
        </div>
        <h1>Create Workspace</h1>
        <p>Start a tenant workspace for domains, users, mailboxes, and mail access.</p>
        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            Workspace
            <input
              value={form.workspaceName}
              onChange={(event) => setForm({ ...form, workspaceName: event.target.value })}
              required
            />
          </label>
          <label>
            Name
            <input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              required
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              minLength={10}
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              required
            />
          </label>
          {error ? <div className="form-error">{error}</div> : null}
          <button className="button auth-button" type="submit" disabled={loading}>
            <Mail size={18} />
            {loading ? "Creating" : "Create workspace"}
            <ArrowRight size={18} />
          </button>
        </form>
      </section>
    </main>
  );
}
