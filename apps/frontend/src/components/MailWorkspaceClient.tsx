"use client";

import { apiPost } from "@/lib/client-api";
import { Mailbox } from "@/lib/platform-data";
import { Inbox, RefreshCw, Send } from "lucide-react";
import { FormEvent, useState, useTransition } from "react";

interface MailMessage {
  id: string;
  from: string;
  subject: string;
  date: string | null;
  seen: boolean;
}

export function MailWorkspaceClient({ mailboxes }: { mailboxes: Mailbox[] }) {
  const activeMailboxes = mailboxes.filter((mailbox) => mailbox.status === "active");
  const [selected, setSelected] = useState(activeMailboxes[0]?.address ?? mailboxes[0]?.address ?? "");
  const [password, setPassword] = useState("");
  const [messages, setMessages] = useState<MailMessage[]>([]);
  const [compose, setCompose] = useState({ to: "", subject: "", text: "" });
  const [notice, setNotice] = useState("");
  const [isPending, startTransition] = useTransition();

  async function loadInbox(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setNotice("");
    startTransition(async () => {
      try {
        const data = await apiPost<MailMessage[]>("/api/mail/messages", {
          email: selected,
          password,
          limit: 20,
        });
        setMessages(data);
        setNotice("Inbox synced.");
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Could not sync inbox.");
      }
    });
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    startTransition(async () => {
      try {
        await apiPost("/api/mail/send", {
          from: selected,
          password,
          ...compose,
        });
        setCompose({ to: "", subject: "", text: "" });
        setNotice("Message sent.");
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Could not send message.");
      }
    });
  }

  return (
    <>
      <section className="mail-workspace-grid">
        <form className="panel mail-login-panel" onSubmit={loadInbox}>
          <div className="metric-row">
            <Inbox size={20} />
            <div className="metric">Mailbox session</div>
          </div>
          <select value={selected} onChange={(event) => setSelected(event.target.value)} required>
            {mailboxes.map((mailbox) => (
              <option key={mailbox.address} value={mailbox.address}>
                {mailbox.address}
              </option>
            ))}
          </select>
          <input
            type="password"
            placeholder="Mailbox password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <button className="button" disabled={!selected || !password || isPending}>
            <RefreshCw size={18} />
            Sync inbox
          </button>
          {notice ? <div className="notice">{notice}</div> : null}
        </form>

        <form className="panel compose-panel" onSubmit={sendMessage}>
          <div className="metric-row">
            <Send size={20} />
            <div className="metric">Compose</div>
          </div>
          <input
            placeholder="To"
            type="email"
            value={compose.to}
            onChange={(event) => setCompose({ ...compose, to: event.target.value })}
            required
          />
          <input
            placeholder="Subject"
            value={compose.subject}
            onChange={(event) => setCompose({ ...compose, subject: event.target.value })}
            required
          />
          <textarea
            placeholder="Write your message"
            value={compose.text}
            onChange={(event) => setCompose({ ...compose, text: event.target.value })}
            required
          />
          <button className="button" disabled={!selected || !password || isPending}>
            <Send size={18} />
            Send
          </button>
        </form>
      </section>

      <section className="panel section">
        <div className="title">
          <h1>Inbox</h1>
          <p>Recent messages loaded through the Yetrix backend using IMAP.</p>
        </div>
        <div className="message-list">
          {messages.map((message) => (
            <article className="message-row" key={message.id}>
              <Inbox size={20} />
              <div>
                <div className="message-head">
                  <strong>{message.from || "Unknown sender"}</strong>
                  <span>{message.date ? new Date(message.date).toLocaleString() : "No date"}</span>
                </div>
                <h2>{message.subject}</h2>
              </div>
              <span className={`badge ${message.seen ? "good" : "warn"}`}>
                {message.seen ? "read" : "new"}
              </span>
            </article>
          ))}
          {messages.length === 0 ? (
            <article className="message-row">
              <Inbox size={20} />
              <div>
                <div className="message-head">
                  <strong>No inbox loaded</strong>
                </div>
                <h2>Choose a mailbox and sync using its password.</h2>
                <p>Messages stay in your mail server; Yetrix only reads them for this session.</p>
              </div>
            </article>
          ) : null}
        </div>
      </section>
    </>
  );
}
