"use client";

import { apiPost } from "@/lib/client-api";
import { Mailbox } from "@/lib/platform-data";
import { CheckCircle2, Eye, Inbox, RefreshCw, Send, Trash2 } from "lucide-react";
import { FormEvent, useState, useTransition } from "react";

interface MailMessage {
  id: string;
  from: string;
  to?: string;
  subject: string;
  date: string | null;
  seen: boolean;
  preview?: string;
}

interface MailDetail extends MailMessage {
  cc?: string;
  text: string;
}

export function MailWorkspaceClient({ mailboxes }: { mailboxes: Mailbox[] }) {
  const activeMailboxes = mailboxes.filter((mailbox) => mailbox.status === "active");
  const [selected, setSelected] = useState(activeMailboxes[0]?.address ?? mailboxes[0]?.address ?? "");
  const [password, setPassword] = useState("");
  const [messages, setMessages] = useState<MailMessage[]>([]);
  const [activeMessage, setActiveMessage] = useState<MailDetail | null>(null);
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
        setActiveMessage(null);
        setNotice("Inbox synced.");
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Could not sync inbox.");
      }
    });
  }

  async function testConnection() {
    setNotice("");
    startTransition(async () => {
      try {
        await apiPost("/api/mail/connection-test", {
          email: selected,
          password,
        });
        setNotice("Mailbox login, IMAP, and SMTP are working.");
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Mailbox test failed.");
      }
    });
  }

  async function openMessage(id: string) {
    setNotice("");
    startTransition(async () => {
      try {
        const message = await apiPost<MailDetail>("/api/mail/message", {
          email: selected,
          password,
          id,
        });
        setActiveMessage(message);
        setMessages((current) =>
          current.map((item) => (item.id === id ? { ...item, seen: true } : item)),
        );
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Could not open message.");
      }
    });
  }

  async function deleteMessage(id: string) {
    if (!window.confirm("Delete this message from the mailbox?")) return;

    setNotice("");
    startTransition(async () => {
      try {
        await apiPost("/api/mail/message/delete", {
          email: selected,
          password,
          id,
        });
        setMessages((current) => current.filter((item) => item.id !== id));
        setActiveMessage((current) => (current?.id === id ? null : current));
        setNotice("Message deleted.");
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Could not delete message.");
      }
    });
  }

  async function sendSelfTest() {
    setNotice("");
    startTransition(async () => {
      try {
        await apiPost("/api/mail/send", {
          from: selected,
          password,
          to: selected,
          subject: `Yetrix self-test ${new Date().toLocaleString()}`,
          text: "This confirms SMTP sending and IMAP receiving for this Yetrix mailbox.",
        });
        setNotice("Self-test sent. Sync inbox to confirm receive.");
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Could not send self-test.");
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
          <div className="mail-session-actions">
            <button
              className="button secondary"
              disabled={!selected || !password || isPending}
              type="button"
              onClick={() => void testConnection()}
            >
              <CheckCircle2 size={18} />
              Test login
            </button>
            <button
              className="button secondary"
              disabled={!selected || !password || isPending}
              type="button"
              onClick={() => void sendSelfTest()}
            >
              <Send size={18} />
              Self-test
            </button>
          </div>
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
                {message.preview ? <p>{message.preview}</p> : null}
              </div>
              <div className="message-actions">
                <span className={`badge ${message.seen ? "good" : "warn"}`}>
                  {message.seen ? "read" : "new"}
                </span>
                <button
                  className="icon-button"
                  title="Open message"
                  onClick={() => void openMessage(message.id)}
                >
                  <Eye size={16} />
                </button>
                <button
                  className="icon-button danger-icon"
                  title="Delete message"
                  onClick={() => void deleteMessage(message.id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
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

      {activeMessage ? (
        <section className="panel section message-detail">
          <div className="message-detail-head">
            <div>
              <span className="muted-text">{activeMessage.from}</span>
              <h1>{activeMessage.subject}</h1>
              <p>
                To {activeMessage.to || selected}
                {activeMessage.date ? ` · ${new Date(activeMessage.date).toLocaleString()}` : ""}
              </p>
            </div>
            <button
              className="icon-button danger-icon"
              title="Delete message"
              onClick={() => void deleteMessage(activeMessage.id)}
            >
              <Trash2 size={16} />
            </button>
          </div>
          <pre className="message-body">{activeMessage.text || "No readable text body."}</pre>
        </section>
      ) : null}
    </>
  );
}
