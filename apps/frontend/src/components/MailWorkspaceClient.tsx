"use client";

import { apiPost, apiPostPublic } from "@/lib/client-api";
import { Mailbox } from "@/lib/platform-data";
import {
  Archive,
  CheckCircle2,
  CircleX,
  Download,
  FileText,
  Folder,
  Forward,
  Inbox,
  LockKeyhole,
  Paperclip,
  RefreshCw,
  Reply,
  Search,
  Send,
  Trash2,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState, useTransition } from "react";

interface MailFolder {
  path: string;
  name: string;
  specialUse?: string | null;
}

interface MessageAttachment {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  dataBase64?: string;
}

interface MailMessage {
  id: string;
  from: string;
  to?: string;
  subject: string;
  date: string | null;
  seen: boolean;
  preview?: string;
  hasAttachments?: boolean;
}

interface MailDetail extends MailMessage {
  cc?: string;
  text: string;
  html?: string;
  attachments?: MessageAttachment[];
}

interface EncodedAttachment {
  filename: string;
  contentType?: string;
  dataBase64: string;
}

interface MailContact {
  email: string;
  name?: string;
  source: "sender" | "recipient";
}

interface MailWorkspaceClientProps {
  mailboxes: Mailbox[];
  publicMode?: boolean;
  initialMailbox?: string;
  initialPassword?: string;
}

export function MailWorkspaceClient({
  mailboxes,
  publicMode = false,
  initialMailbox = "",
  initialPassword = "",
}: MailWorkspaceClientProps) {
  const activeMailboxes = mailboxes.filter((mailbox) => mailbox.status === "active");
  const [selected, setSelected] = useState(
    initialMailbox || activeMailboxes[0]?.address || mailboxes[0]?.address || "",
  );
  const [password, setPassword] = useState(initialPassword);
  const [folder, setFolder] = useState("INBOX");
  const [search, setSearch] = useState("");
  const [folders, setFolders] = useState<MailFolder[]>([{ path: "INBOX", name: "Inbox" }]);
  const [messages, setMessages] = useState<MailMessage[]>([]);
  const [contacts, setContacts] = useState<MailContact[]>([]);
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
  const post = publicMode ? apiPostPublic : apiPost;
  const draftKey = `yetrix-mail-draft:${publicMode ? "public" : "admin"}:${selected}`;

  useEffect(() => {
    const saved = window.localStorage.getItem(draftKey);
    try {
      setCompose(saved ? (JSON.parse(saved) as typeof compose) : { to: "", subject: "", text: "" });
    } catch {
      setCompose({ to: "", subject: "", text: "" });
    }
    setAttachments([]);
  }, [draftKey]);

  useEffect(() => {
    if (compose.to || compose.subject || compose.text) {
      window.localStorage.setItem(draftKey, JSON.stringify(compose));
    }
  }, [compose, draftKey]);

  async function loadInbox(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setNotice("");
    startTransition(async () => {
      try {
        const data = await post<MailMessage[]>("/api/mail/messages", {
          email: selected,
          password,
          folder,
          search: search.trim() || undefined,
          limit: 40,
        });
        setMessages(data);
        setActiveMessage(null);
        setNotice("Mailbox synced.");
        void loadContacts();
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Could not sync mailbox.");
      }
    });
  }

  async function testConnection() {
    setNotice("");
    startTransition(async () => {
      try {
        await post("/api/mail/connection-test", { email: selected, password });
        setNotice("Mailbox login, IMAP, and SMTP are working.");
        void loadFolders();
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Mailbox test failed.");
      }
    });
  }

  async function loadFolders() {
    setNotice("");
    startTransition(async () => {
      try {
        const data = await post<MailFolder[]>("/api/mail/folders", {
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

  async function loadContacts() {
    if (!selected || !password) return;

    try {
      const data = await post<MailContact[]>("/api/mail/contacts", {
        email: selected,
        password,
      });
      setContacts(data.slice(0, 24));
    } catch {
      setContacts([]);
    }
  }

  async function openMessage(id: string) {
    setNotice("");
    startTransition(async () => {
      try {
        const message = await post<MailDetail>("/api/mail/message", {
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

  async function moveActiveMessage(action: "archive" | "trash" | "delete") {
    if (!activeMessage) return;
    const label = action === "archive" ? "Archive" : action === "trash" ? "Move to trash" : "Delete";
    if (action === "delete" && !window.confirm("Delete this message from the mailbox?")) return;

    setNotice("");
    startTransition(async () => {
      try {
        await post(`/api/mail/message/${action}`, {
          email: selected,
          password,
          folder,
          id: activeMessage.id,
        });
        setMessages((current) => current.filter((item) => item.id !== activeMessage.id));
        setActiveMessage(null);
        setNotice(`${label} completed.`);
      } catch (error) {
        setNotice(error instanceof Error ? error.message : `${label} failed.`);
      }
    });
  }

  async function sendSelfTest() {
    setNotice("");
    startTransition(async () => {
      try {
        await post("/api/mail/send", {
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
        await post("/api/mail/send", {
          from: selected,
          password,
          ...compose,
          attachments: encodedAttachments,
        });
        setCompose({ to: "", subject: "", text: "" });
        setAttachments([]);
        window.localStorage.removeItem(draftKey);
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

  function startReply() {
    if (!activeMessage) return;
    setCompose({
      to: firstAddress(activeMessage.from),
      subject: activeMessage.subject.startsWith("Re:") ? activeMessage.subject : `Re: ${activeMessage.subject}`,
      text: `\n\nOn ${activeMessage.date ? new Date(activeMessage.date).toLocaleString() : "this message"}, ${activeMessage.from} wrote:\n${quoteText(activeMessage.text)}`,
    });
  }

  function startForward() {
    if (!activeMessage) return;
    setCompose({
      to: "",
      subject: activeMessage.subject.startsWith("Fwd:") ? activeMessage.subject : `Fwd: ${activeMessage.subject}`,
      text: `\n\nForwarded message\nFrom: ${activeMessage.from}\nTo: ${activeMessage.to ?? selected}\nDate: ${
        activeMessage.date ? new Date(activeMessage.date).toLocaleString() : ""
      }\n\n${activeMessage.text}`,
    });
  }

  function addContactToComposer(contact: MailContact) {
    setCompose((current) => ({
      ...current,
      to: contact.email,
    }));
  }

  return (
    <section className="outlook-shell">
      <aside className="outlook-sidebar">
        <div className="outlook-account">
          <div className="metric-row">
            <LockKeyhole size={18} />
            <div className="metric">{publicMode ? "Mailbox session" : "Mailbox login"}</div>
          </div>
          {publicMode ? (
            <input
              placeholder="name@company.com"
              type="email"
              value={selected}
              onChange={(event) => setSelected(event.target.value)}
              required
            />
          ) : (
            <select value={selected} onChange={(event) => setSelected(event.target.value)} required>
              {mailboxes.map((mailbox) => (
                <option key={mailbox.address} value={mailbox.address}>
                  {mailbox.address}
                </option>
              ))}
              {mailboxes.length === 0 ? <option value="">Create a mailbox first</option> : null}
            </select>
          )}
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

        <div className="contact-panel">
          <strong>Contacts</strong>
          {contacts.map((contact) => (
            <button key={contact.email} type="button" onClick={() => addContactToComposer(contact)}>
              <span>{initials(contact.name ?? contact.email)}</span>
              <small>{contact.name ?? contact.email}</small>
            </button>
          ))}
          {contacts.length === 0 ? <em>No contacts loaded</em> : null}
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
                <small>
                  {message.subject}
                  {message.hasAttachments ? <Paperclip size={13} /> : null}
                </small>
                {message.preview ? <em>{message.preview}</em> : null}
              </span>
              <time>{message.date ? new Date(message.date).toLocaleDateString() : ""}</time>
            </button>
          ))}
          {messages.length === 0 ? (
            <div className="outlook-empty">
              <Inbox size={28} />
              <strong>No messages loaded</strong>
              <span>{selectedMailbox?.address ?? (selected || "Mailbox")}</span>
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
              <div className="message-action-row">
                <button className="icon-button" title="Reply" type="button" onClick={startReply}>
                  <Reply size={16} />
                </button>
                <button className="icon-button" title="Forward" type="button" onClick={startForward}>
                  <Forward size={16} />
                </button>
                <button
                  className="icon-button"
                  title="Archive"
                  type="button"
                  onClick={() => void moveActiveMessage("archive")}
                >
                  <Archive size={16} />
                </button>
                <button
                  className="icon-button danger-icon"
                  title="Move to trash"
                  type="button"
                  onClick={() => void moveActiveMessage("trash")}
                >
                  <Trash2 size={16} />
                </button>
                <button
                  className="icon-button danger-icon"
                  title="Delete permanently"
                  type="button"
                  onClick={() => void moveActiveMessage("delete")}
                >
                  <CircleX size={16} />
                </button>
              </div>
            </div>
            {activeMessage.html ? (
              <iframe className="message-html" sandbox="" srcDoc={activeMessage.html} title="Email body" />
            ) : (
              <pre className="message-body">{activeMessage.text || "No readable text body."}</pre>
            )}
            {(activeMessage.attachments ?? []).length > 0 ? (
              <div className="received-attachments">
                {(activeMessage.attachments ?? []).map((attachment) => (
                  <button
                    key={attachment.id}
                    type="button"
                    onClick={() => downloadAttachment(attachment, setNotice)}
                  >
                    <Download size={15} />
                    <span>{attachment.filename}</span>
                    <small>{formatBytes(attachment.sizeBytes)}</small>
                  </button>
                ))}
              </div>
            ) : null}
          </article>
        ) : (
          <article className="reader-card reader-empty">
            <Inbox size={30} />
            <h1>{selectedMailbox?.address ?? (selected || "Mail workspace")}</h1>
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
            type="text"
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

function downloadAttachment(
  attachment: MessageAttachment,
  setNotice: (message: string) => void,
) {
  if (!attachment.dataBase64) {
    setNotice("This attachment is too large to preview from the browser.");
    return;
  }

  const bytes = Uint8Array.from(window.atob(attachment.dataBase64), (char) => char.charCodeAt(0));
  const blob = new Blob([bytes], { type: attachment.contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = attachment.filename;
  link.click();
  URL.revokeObjectURL(url);
}

function firstAddress(value: string) {
  return value.split(",")[0]?.trim() ?? "";
}

function quoteText(value: string) {
  return value
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
}

function initials(value: string) {
  return value
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 KB";
  }

  if (bytes >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  return `${Math.ceil(bytes / 1024)} KB`;
}
