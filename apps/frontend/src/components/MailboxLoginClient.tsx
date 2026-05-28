"use client";

import { apiPostPublic } from "@/lib/client-api";
import { ArrowRight, Inbox, LockKeyhole, Mail } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { MailWorkspaceClient } from "./MailWorkspaceClient";

const sessionKey = "yetrix-mailbox-session";

export function MailboxLoginClient() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [readyMailbox, setReadyMailbox] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = window.sessionStorage.getItem(sessionKey);
    if (saved) {
      setEmail(saved);
      setReadyMailbox(saved);
    }
  }, []);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await apiPostPublic("/api/mail/connection-test", { email, password });
      window.sessionStorage.setItem(sessionKey, email);
      setReadyMailbox(email);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Mailbox login failed.");
    } finally {
      setLoading(false);
    }
  }

  if (readyMailbox) {
    return (
      <main className="mailbox-portal">
        <header className="mailbox-portal-head">
          <div>
            <span className="eyebrow">
              <Inbox size={15} />
              Yetrix Mail
            </span>
            <h1>{readyMailbox}</h1>
          </div>
          <button
            className="button secondary"
            type="button"
            onClick={() => {
              window.sessionStorage.removeItem(sessionKey);
              setReadyMailbox("");
              setPassword("");
            }}
          >
            Switch mailbox
          </button>
        </header>
        <MailWorkspaceClient
          publicMode
          initialMailbox={readyMailbox}
          initialPassword={password}
          mailboxes={[]}
        />
      </main>
    );
  }

  return (
    <main className="auth-page mailbox-auth-page">
      <section className="auth-art" aria-hidden="true">
        <div className="auth-brand">Yetrix Mail</div>
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
      <section className="auth-panel" aria-label="Mailbox login">
        <div className="auth-mark">
          <Mail size={22} />
        </div>
        <h1>Mailbox Login</h1>
        <p>Open your hosted business inbox with the mailbox address and password.</p>
        <form className="login-form" onSubmit={login}>
          <label>
            Email address
            <input
              autoComplete="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label>
            Mailbox password
            <input
              autoComplete="current-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          {error ? <div className="form-error">{error}</div> : null}
          <button className="button auth-button" type="submit" disabled={loading}>
            <LockKeyhole size={18} />
            {loading ? "Opening" : "Open mailbox"}
            <ArrowRight size={18} />
          </button>
        </form>
      </section>
    </main>
  );
}
