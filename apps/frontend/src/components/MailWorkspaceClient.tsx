"use client";

import { apiPost } from "@/lib/client-api";
import { Mailbox } from "@/lib/platform-data";
import {
  CheckCircle2,
  FileText,
  Folder,
  Inbox,
  LockKeyhole,
  Paperclip,
  RefreshCw,
  Search,
  Send,
  Trash2,
} from "lucide-react";
import { FormEvent, useMemo, useState, useTransition } from "react";

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

interface EncodedAttachment {
  filename: string;
  contentType?: string;
  dataBase64: string;
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
  const [attachments, setAttachments] = useState<File[]>([]);
  const [notice, setNotice] = useState("");
  const [isPending, startTransition] = useTransition();
  const folderTitle = folders.find((item) => item.path === folder)?.name ?? folder;
  const selectedMailbox = useMemo(
    () => mailboxes.find((mailbox) => mailbox.address === selected),
    [mailboxes, selected],
  );

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
          limit: 40,
        });
        setMessages(data);
        setActiveMessage(null);
        setNotice("Mailbox synced.");
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Could not sync mailbox.");
      }
    });
  }

  async function testConnection() {
    setNotice("");
    startTransition(async () => {
      try {
        await apiPost("/api/mail/connection-test", { email: selected, password });
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
        const encodedAttachments = await Promise.all(attachments.map(readAttachment));
        await apiPost("/api/mail/send", {
          from: selected,
          password,
          ...compose,
          attachments: encodedAttachments,
        });
        setCompose({ to: "", subject: "", text: "" });
        setAttachments([]);
        setNotice(
          encodedAttachments.length > 0
            ? "Message sent and attachments saved locally."
            : "Message sent.",
        );
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Could not send message.");
      }
    });
  }

  return (
    <section className="outlook-shell">
      <aside className="outlook-sidebar">
        <div className="outlook-account">
          <div className="metric-row">
            <LockKeyhole size={18} />
            <div className="metric">Mailbox login</div>
          </div>
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
          <div className="mail-session-actions">
            <button
              className="icon-button"
              disabled={!selected || !password || isPending}
              title="Test mailbox login"
              type="button"
              onClick={() => void testConnection()}
            >
              <CheckCircle2 size={16} />
            </button>
            <button
              className="icon-button"
              disabled={!selected || !password || isPending}
              title="Load folders"
              type="button"
              onClick={() => void loadFolders()}
            >
              <RefreshCw size={16} />
            </button>
            <button
              className="icon-button"
              disabled={!selected || !password || isPending}
              title="Send self-test"
              type="button"
              onClick={() => void sendSelfTest()}
            >
              <Send size={16} />
            </button>
          </div>
        </div>

        <div className="folder-list">
          {folders.map((item) => (
            <button
              className={`outlook-folder ${folder === item.path ? "active" : ""}`}
              key={item.path}
              type="button"
              onClick={() => setFolder(item.path)}
            >
              {item.specialUse === "\\Sent" ? <Send size={16} /> : <Folder size={16} />}
              <span>{item.specialUse === "\\Sent" ? "Sent" : item.name}</span>
            </button>
          ))}
        </div>
      </aside>

      <div className="outlook-list-pane">
        <form className="outlook-toolbar" onSubmit={loadInbox}>
          <div>
            <h2>{folderTitle}</h2>
            <span>{messages.length} messages</span>
          </div>
          <label className="search-box">
            <Search size={16} />
            <input
              placeholder="Search mail"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <button className="button" disabled={!selected || !password || isPending}>
            <RefreshCw size={18} />
            Sync
          </button>
        </form>

        {notice ? <div className="notice">{notice}</div> : null}

        <div className="outlook-message-list">
          {messages.map((message) => (
            <button
              className={`outlook-message ${activeMessage?.id === message.id ? "active" : ""}`}
              key={message.id}
              type="button"
              onClick={() => void openMessage(message.id)}
            >
              <span className={`read-dot ${message.seen ? "seen" : ""}`} />
              <span>
                <strong>{message.from || "Unknown sender"}</strong>
                <small>{message.subject}</small>
                {message.preview ? <em>{message.preview}</em> : null}
              </span>
              <time>{message.date ? new Date(message.date).toLocaleDateString() : ""}</time>
            </button>
          ))}
          {messages.length === 0 ? (
            <div className="outlook-empty">
              <Inbox size={28} />
              <strong>No messages loaded</strong>
              <span>{selectedMailbox?.address ?? "Mailbox"}</span>
            </div>
          ) : null}
        </div>
      </div>

      <section className="outlook-reading-pane">
        {activeMessage ? (
          <article className="reader-card">
            <div className="reader-head">
              <div>
                <span className="muted-text">{activeMessage.from}</span>
                <h1>{activeMessage.subject}</h1>
                <p>
                  To {activeMessage.to || selected}
                  {activeMessage.date ? ` - ${new Date(activeMessage.date).toLocaleString()}` : ""}
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
          </article>
        ) : (
          <article className="reader-card reader-empty">
            <Inbox size={30} />
            <h1>{selectedMailbox?.address ?? "Mail workspace"}</h1>
            <p>No message selected.</p>
          </article>
        )}

        <form className="compose-card" onSubmit={sendMessage}>
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
          <label className="attachment-picker">
            <Paperclip size={17} />
            <span>{attachments.length > 0 ? `${attachments.length} attached` : "Attach files"}</span>
            <input
              multiple
              type="file"
              onChange={(event) => setAttachments(Array.from(event.target.files ?? []))}
            />
          </label>
          {attachments.length > 0 ? (
            <div className="attachment-list">
              {attachments.map((file) => (
                <span key={`${file.name}-${file.size}`}>
                  <FileText size={14} />
                  {file.name}
                </span>
              ))}
            </div>
          ) : null}
          <button className="button" disabled={!selected || !password || isPending}>
            <Send size={18} />
            Send
          </button>
        </form>
      </section>
    </section>
  );
}

function readAttachment(file: File): Promise<EncodedAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve({
        filename: file.name,
        contentType: file.type || "application/octet-stream",
        dataBase64: result.includes(",") ? result.split(",")[1] : result,
      });
    };
    reader.readAsDataURL(file);
  });
}
