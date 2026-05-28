"use client";

import { ArrowRight, LockKeyhole, Mail } from "lucide-react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });
      const payload = (await response.json()) as { success?: boolean; error?: string };
      if (!response.ok || payload.success === false) {
        throw new Error(payload.error ?? "Login failed");
      }
      router.push("/dashboard");
      router.refresh();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Login failed");
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
      <section className="auth-panel" aria-label="Admin login">
        <div className="auth-mark">
          <Mail size={22} />
        </div>
        <h1>Admin Login</h1>
        <p>Enter your backend admin credentials to open the workspace dashboard.</p>
        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            Username
            <input value={username} onChange={(event) => setUsername(event.target.value)} />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error ? <div className="form-error">{error}</div> : null}
          <button className="button auth-button" type="submit" disabled={loading}>
            <LockKeyhole size={18} />
            {loading ? "Signing in" : "Login"}
            <ArrowRight size={18} />
          </button>
        </form>
      </section>
    </main>
  );
}
