"use client";

import { apiPost } from "@/lib/client-api";
import { Mailbox } from "@/lib/platform-data";
import {
  CheckCircle2,
  Eye,
  FolderSync,
  Inbox,
  LockKeyhole,
  RefreshCw,
  Search,
  Send,
  Trash2,
} from "lucide-react";
import { FormEvent, useState, useTransition } from "react";

interface MailFolder {
  path: string;
  name: string;
  specialUse?: string | null;
}

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
  const [folder, setFolder] = useState("INBOX");
  const [search, setSearch] = useState("");
  const [folders, setFolders] = useState<MailFolder[]>([{ path: "INBOX", name: "Inbox" }]);
  const [messages, setMessages] = useState<MailMessage[]>([]);
  const [activeMessage, setActiveMessage] = useState<MailDetail | null>(null);
  const [compose, setCompose] = useState({ to: "", subject: "", text: "" });
  const [notice, setNotice] = useState("");
  const [isPending, startTransition] = useTransition();
  const folderTitle = folders.find((item) => item.path === folder)?.name ?? folder;

  async function loadInbox(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setNotice("");
    startTransition(async () => {
      try {
        const data = await apiPost<MailMessage[]>("/api/mail/messages", {
          email: selected,
          password,
          folder,
          search: search.trim() || undefined,
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

  async function loadFolders() {
    setNotice("");
    startTransition(async () => {
      try {
        const data = await apiPost<MailFolder[]>("/api/mail/folders", {
          email: selected,
          password,
        });
        setFolders(data.length > 0 ? data : [{ path: "INBOX", name: "Inbox" }]);
        setNotice("Folders loaded.");
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Could not load folders.");
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
          folder,
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
          folder,
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
      <section className="mail-console-hero">
        <div>
          <div className="eyebrow light">
            <LockKeyhole size={16} />
            Private mail workspace
          </div>
          <h2>Read, search, send, and test hosted mailboxes from your Yetrix panel.</h2>
          <p>
            The browser talks only to your backend. Mailbox passwords are used for this live IMAP
            and SMTP session, while the Mailcow admin UI stays hidden.
          </p>
        </div>
        <div className="mail-console-path">
          <div>
            <Inbox size={17} />
            <span>Login</span>
          </div>
          <div>
            <FolderSync size={17} />
            <span>Folders</span>
          </div>
          <div>
            <Search size={17} />
            <span>Search</span>
          </div>
          <div>
            <Send size={17} />
            <span>Send</span>
          </div>
        </div>
        <div className="mail-console-stats">
          <div>
            <strong>{activeMailboxes.length}</strong>
            <span>active mailboxes</span>
          </div>
          <div>
            <strong>{folders.length}</strong>
            <span>loaded folders</span>
          </div>
        </div>
      </section>

      <section className="mail-workspace-grid">
        <form className="panel mail-login-panel" onSubmit={loadInbox}>
          <div className="metric-row">
            <Inbox size={20} />
            <div className="metric">Mailbox session</div>
          </div>
          <p className="panel-note">Select a mailbox, enter its mailbox password, then sync mail.</p>
          <select value={selected} onChange={(event) => setSelected(event.target.value)} required>
            {mailboxes.map((mailbox) => (
              <option key={mailbox.address} value={mailbox.address}>
                {mailbox.address}
              </option>
            ))}
            {mailboxes.length === 0 ? <option value="">Create a mailbox first</option> : null}
          </select>
          <input
            type="password"
            placeholder="Mailbox password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <div className="mail-session-row">
            <select value={folder} onChange={(event) => setFolder(event.target.value)}>
              {folders.map((item) => (
                <option key={item.path} value={item.path}>
                  {item.specialUse === "\\Sent" ? "Sent" : item.name}
                </option>
              ))}
            </select>
            <button
              className="button secondary"
              disabled={!selected || !password || isPending}
              type="button"
              onClick={() => void loadFolders()}
            >
              <RefreshCw size={18} />
              Folders
            </button>
          </div>
          <input
            placeholder="Search sender, subject, or body"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <button className="button" disabled={!selected || !password || isPending}>
            <RefreshCw size={18} />
            Sync mail
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
          <p className="panel-note">Send mail through SMTP using the selected mailbox identity.</p>
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
          <h1>{folderTitle}</h1>
          <p>
            Messages loaded through the Yetrix backend using IMAP
            {search.trim() ? ` for "${search.trim()}"` : ""}.
          </p>
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
