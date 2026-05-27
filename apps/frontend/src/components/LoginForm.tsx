"use client";

import { ArrowRight, LockKeyhole, Mail } from "lucide-react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin");
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (username === "admin" && password === "admin") {
      window.localStorage.setItem("yetrix-admin", "true");
      router.push("/dashboard");
      return;
    }

    setError("Use admin / admin for this demo login.");
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
        <p>Enter the temporary demo credentials to open the workspace dashboard.</p>
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
          <button className="button auth-button" type="submit">
            <LockKeyhole size={18} />
            Login
            <ArrowRight size={18} />
          </button>
        </form>
      </section>
    </main>
  );
}
