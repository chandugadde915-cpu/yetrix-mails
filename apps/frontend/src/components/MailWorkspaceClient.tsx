"use client";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { apiPost, apiPostPublic } from "@/lib/client-api";
import { Mailbox } from "@/lib/platform-data";
import {
  Archive,
  Bold,
  CheckCircle2,
  CircleX,
  Download,
  FileText,
  Filter,
  Folder,
  Forward,
  Inbox,
  Italic,
  List,
  LockKeyhole,
  Paperclip,
  RefreshCw,
  Reply,
  Search,
  Send,
  Star,
  Trash2,
  Underline,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState, useTransition } from "react";

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
  flagged?: boolean;
  preview?: string;
  hasAttachments?: boolean;
  threadKey?: string;
  threadSize?: number;
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

interface ComposeState {
  to: string;
  subject: string;
  text: string;
  html: string;
}

interface MailWorkspaceClientProps {
  mailboxes: Mailbox[];
  publicMode?: boolean;
  initialMailbox?: string;
  initialPassword?: string;
  initialNotice?: string;
}

interface MailConnectionStatus {
  imap?: boolean;
  canRead?: boolean;
  warnings?: string[];
}

interface SmtpHealth {
  success?: boolean;
  smtp?: "connected" | "disconnected" | string;
  error?: string;
}

const smtpWarningMessage = "Sending mail is currently unavailable. Receiving mail still works.";
const sendUnavailableMessage = "Unable to send email right now. Please try again later.";

export function MailWorkspaceClient({
  mailboxes,
  publicMode = false,
  initialMailbox = "",
  initialPassword = "",
  initialNotice = "",
}: MailWorkspaceClientProps) {
  const activeMailboxes = mailboxes.filter((mailbox) => mailbox.status === "active");
  const [selected, setSelected] = useState(
    initialMailbox || activeMailboxes[0]?.address || mailboxes[0]?.address || "",
  );
  const [password, setPassword] = useState(initialPassword);
  const [folder, setFolder] = useState("INBOX");
  const [folders, setFolders] = useState<MailFolder[]>([{ path: "INBOX", name: "Inbox" }]);
  const [messages, setMessages] = useState<MailMessage[]>([]);
  const [contacts, setContacts] = useState<MailContact[]>([]);
  const [activeMessage, setActiveMessage] = useState<MailDetail | null>(null);
  const [messageDeleteDialog, setMessageDeleteDialog] = useState<MailDetail | null>(null);
  const [compose, setCompose] = useState<ComposeState>({ to: "", subject: "", text: "", html: "" });
  const [attachments, setAttachments] = useState<File[]>([]);
  const [filters, setFilters] = useState({
    query: "",
    from: "",
    to: "",
    subject: "",
    since: "",
    unreadOnly: false,
    flaggedOnly: false,
    attachmentsOnly: false,
  });
  const [notice, setNotice] = useState(initialNotice);
  const [smtpStatus, setSmtpStatus] = useState<"unknown" | "connected" | "disconnected">("unknown");
  const [isPending, startTransition] = useTransition();
  const editorRef = useRef<HTMLDivElement>(null);
  const folderTitle = folders.find((item) => item.path === folder)?.name ?? folder;
  const isDraftFolder = folder === "__drafts";
  const selectedMailbox = useMemo(
    () => mailboxes.find((mailbox) => mailbox.address === selected),
    [mailboxes, selected],
  );
  const post = publicMode ? apiPostPublic : apiPost;
  const draftKey = `yetrix-mail-draft:${publicMode ? "public" : "admin"}:${selected}`;
  const draftMessages = useMemo(() => buildDraftMessages(draftKey, compose), [draftKey, compose]);
  const visibleMessages = isDraftFolder ? draftMessages : messages;
  const smtpDisconnected = smtpStatus === "disconnected";

  useEffect(() => {
    void checkSmtpHealth(true);
  }, []);

  useEffect(() => {
    const saved = window.localStorage.getItem(draftKey);
    try {
      setCompose(saved ? (JSON.parse(saved) as ComposeState) : emptyCompose());
    } catch {
      setCompose(emptyCompose());
    }
    setAttachments([]);
  }, [draftKey]);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== compose.html) {
      editorRef.current.innerHTML = compose.html;
    }
  }, [compose.html]);

  useEffect(() => {
    if (compose.to || compose.subject || compose.text || compose.html) {
      window.localStorage.setItem(draftKey, JSON.stringify(compose));
    }
  }, [compose, draftKey]);

  async function loadInbox(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (isDraftFolder) {
      setNotice("Drafts loaded.");
      return;
    }

    setNotice("");
    startTransition(async () => {
      try {
        const data = await post<MailMessage[]>("/api/mail/messages", {
          email: selected,
          password,
          folder,
          search: filters.query.trim() || undefined,
          from: filters.from.trim() || undefined,
          to: filters.to.trim() || undefined,
          subject: filters.subject.trim() || undefined,
          since: filters.since || undefined,
          unreadOnly: filters.unreadOnly || undefined,
          flaggedOnly: filters.flaggedOnly || undefined,
          attachmentsOnly: filters.attachmentsOnly || undefined,
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
        await post<MailConnectionStatus>("/api/mail/connection-test", { email: selected, password });
        setNotice(
          smtpDisconnected
            ? smtpWarningMessage
            : "Mailbox login is working. Inbox access is ready.",
        );
        void checkSmtpHealth(false);
        void loadFolders();
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Mailbox test failed.");
      }
    });
  }

  async function checkSmtpHealth(silent: boolean) {
    try {
      const response = await fetch("/api/mailbox/smtp-health", {
        cache: "no-store",
        headers: { accept: "application/json" },
      });
      const payload = (await response.json()) as SmtpHealth;
      const connected = response.ok && payload.success === true && payload.smtp === "connected";
      setSmtpStatus(connected ? "connected" : "disconnected");
      if (!connected && !silent) {
        setNotice(smtpWarningMessage);
      }
    } catch {
      setSmtpStatus("disconnected");
      if (!silent) {
        setNotice(smtpWarningMessage);
      }
    }
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
    if (id.startsWith("draft:")) {
      setActiveMessage(null);
      setNotice("Draft loaded.");
      setFolder("__drafts");
      return;
    }

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

  async function toggleFlag(message: MailMessage | MailDetail) {
    const flagged = !message.flagged;
    setNotice("");
    startTransition(async () => {
      try {
        await post(`/api/mail/message/${flagged ? "flag" : "unflag"}`, {
          email: selected,
          password,
          folder,
          id: message.id,
        });
        setMessages((current) =>
          current.map((item) => (item.id === message.id ? { ...item, flagged } : item)),
        );
        setActiveMessage((current) =>
          current?.id === message.id ? { ...current, flagged } : current,
        );
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Could not update flag.");
      }
    });
  }

  async function moveActiveMessage(action: "archive" | "trash" | "delete") {
    if (!activeMessage) return;
    if (action === "delete") {
      setMessageDeleteDialog(activeMessage);
      return;
    }

    await commitMessageMove(action, activeMessage);
  }

  async function confirmDeleteMessage() {
    if (!messageDeleteDialog) return;
    await commitMessageMove("delete", messageDeleteDialog);
    setMessageDeleteDialog(null);
  }

  async function commitMessageMove(action: "archive" | "trash" | "delete", message: MailDetail) {
    const label = action === "archive" ? "Archive" : action === "trash" ? "Move to trash" : "Delete";

    setNotice("");
    startTransition(async () => {
      try {
        await post(`/api/mail/message/${action}`, {
          email: selected,
          password,
          folder,
          id: message.id,
        });
        setMessages((current) => current.filter((item) => item.id !== message.id));
        setActiveMessage(null);
        setNotice(`${label} completed.`);
      } catch (error) {
        setNotice(error instanceof Error ? error.message : `${label} failed.`);
      }
    });
  }

  async function sendSelfTest() {
    if (smtpDisconnected) {
      setNotice(sendUnavailableMessage);
      return;
    }

    setNotice("");
    startTransition(async () => {
      try {
        await post("/api/mail/send", {
          from: selected,
          password,
          to: selected,
          subject: `Yetrix self-test ${new Date().toLocaleString()}`,
          text: "This confirms sending and receiving for this Yetrix mailbox.",
        });
        setNotice("Self-test sent. Sync inbox to confirm receive.");
      } catch (error) {
        setNotice(sendErrorMessage(error));
        void checkSmtpHealth(true);
      }
    });
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (smtpDisconnected) {
      setNotice(sendUnavailableMessage);
      return;
    }

    setNotice("");
    startTransition(async () => {
      try {
        const encodedAttachments = await Promise.all(attachments.map(readAttachment));
        await post("/api/mail/send", {
          from: selected,
          password,
          ...compose,
          text: compose.text || textFromHtml(compose.html),
          html: compose.html || undefined,
          attachments: encodedAttachments,
        });
        setCompose(emptyCompose());
        setAttachments([]);
        if (editorRef.current) {
          editorRef.current.innerHTML = "";
        }
        window.localStorage.removeItem(draftKey);
        setNotice(
          encodedAttachments.length > 0
            ? "Message sent and attachments saved locally."
            : "Message sent.",
        );
      } catch (error) {
        setNotice(sendErrorMessage(error));
        void checkSmtpHealth(true);
      }
    });
  }

  async function saveDraft() {
    if (!selected) {
      setNotice("Choose a mailbox before saving a draft.");
      return;
    }

    setNotice("");
    startTransition(async () => {
      try {
        const encodedAttachments = await Promise.all(attachments.map(readAttachment));
        await post("/api/mail/draft", {
          from: selected,
          password,
          to: compose.to || undefined,
          subject: compose.subject || undefined,
          text: compose.text || textFromHtml(compose.html),
          html: compose.html || undefined,
          attachments: encodedAttachments,
        });
        setNotice("Draft saved.");
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Could not save draft.");
      }
    });
  }

  function startReply() {
    if (!activeMessage) return;
    setCompose({
      to: firstAddress(activeMessage.from),
      subject: activeMessage.subject.startsWith("Re:") ? activeMessage.subject : `Re: ${activeMessage.subject}`,
      text: `\n\nOn ${activeMessage.date ? new Date(activeMessage.date).toLocaleString() : "this message"}, ${activeMessage.from} wrote:\n${quoteText(activeMessage.text)}`,
      html: `<p><br></p><blockquote>${escapeHtml(activeMessage.text).replace(/\n/g, "<br>")}</blockquote>`,
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
      html: `<p><br></p><hr><p><strong>Forwarded message</strong></p><p>From: ${escapeHtml(activeMessage.from)}<br>To: ${escapeHtml(activeMessage.to ?? selected)}<br>Date: ${
        activeMessage.date ? new Date(activeMessage.date).toLocaleString() : ""
      }</p><blockquote>${escapeHtml(activeMessage.text).replace(/\n/g, "<br>")}</blockquote>`,
    });
  }

  function addContactToComposer(contact: MailContact) {
    setCompose((current) => ({
      ...current,
      to: contact.email,
    }));
  }

  function formatRichText(command: "bold" | "italic" | "underline" | "insertUnorderedList") {
    editorRef.current?.focus();
    document.execCommand(command);
    updateComposeHtml();
  }

  function updateComposeHtml() {
    const html = editorRef.current?.innerHTML ?? "";
    setCompose((current) => ({
      ...current,
      html,
      text: textFromHtml(html),
    }));
  }

  function openQuickFolder(specialUse: string, fallback: string) {
    const match =
      folders.find((item) => item.specialUse === specialUse) ??
      folders.find((item) => item.name.toLowerCase() === fallback.toLowerCase());
    setFolder(match?.path ?? fallback);
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
              title={smtpDisconnected ? "Sending unavailable" : "Send self-test"}
              type="button"
              onClick={() => void sendSelfTest()}
            >
              <Send size={16} />
            </button>
          </div>
        </div>

        <div className="quick-folder-grid">
          <button className={folder === "INBOX" ? "active" : ""} type="button" onClick={() => setFolder("INBOX")}>
            <Inbox size={15} />
            <span>Inbox</span>
          </button>
          <button type="button" onClick={() => openQuickFolder("\\Sent", "Sent")}>
            <Send size={15} />
            <span>Sent</span>
          </button>
          <button className={isDraftFolder ? "active" : ""} type="button" onClick={() => setFolder("__drafts")}>
            <FileText size={15} />
            <span>Drafts</span>
          </button>
          <button type="button" onClick={() => openQuickFolder("\\Trash", "Trash")}>
            <Trash2 size={15} />
            <span>Trash</span>
          </button>
          <button type="button" onClick={() => openQuickFolder("\\Archive", "Archive")}>
            <Archive size={15} />
            <span>Archive</span>
          </button>
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
            <h2>{isDraftFolder ? "Drafts" : folderTitle}</h2>
            <span>{visibleMessages.length} messages</span>
          </div>
          <label className="search-box">
            <Search size={16} />
            <input
              placeholder="Search mail"
              value={filters.query}
              onChange={(event) => setFilters({ ...filters, query: event.target.value })}
            />
          </label>
          <button className="button" disabled={!selected || !password || isPending}>
            <RefreshCw size={18} />
            Sync
          </button>
          <div className="advanced-search-strip">
            <label>
              <Filter size={14} />
              <input
                placeholder="From"
                value={filters.from}
                onChange={(event) => setFilters({ ...filters, from: event.target.value })}
              />
            </label>
            <label>
              <input
                placeholder="Subject"
                value={filters.subject}
                onChange={(event) => setFilters({ ...filters, subject: event.target.value })}
              />
            </label>
            <label>
              <input
                type="date"
                value={filters.since}
                onChange={(event) => setFilters({ ...filters, since: event.target.value })}
              />
            </label>
            <button
              className={filters.unreadOnly ? "active" : ""}
              type="button"
              onClick={() => setFilters({ ...filters, unreadOnly: !filters.unreadOnly })}
            >
              Unread
            </button>
            <button
              className={filters.flaggedOnly ? "active" : ""}
              type="button"
              onClick={() => setFilters({ ...filters, flaggedOnly: !filters.flaggedOnly })}
            >
              Starred
            </button>
            <button
              className={filters.attachmentsOnly ? "active" : ""}
              type="button"
              onClick={() => setFilters({ ...filters, attachmentsOnly: !filters.attachmentsOnly })}
            >
              Files
            </button>
          </div>
        </form>

        {smtpDisconnected ? <div className="notice warn-notice">{smtpWarningMessage}</div> : null}
        {notice ? <div className="notice">{notice}</div> : null}

        <div className="outlook-message-list">
          {visibleMessages.map((message) => (
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
                  {message.flagged ? <Star className="starred" size={13} /> : null}
                  {message.hasAttachments ? <Paperclip size={13} /> : null}
                  {(message.threadSize ?? 1) > 1 ? <span className="thread-pill">{message.threadSize}</span> : null}
                </small>
                {message.preview ? <em>{message.preview}</em> : null}
              </span>
              <time>{message.date ? new Date(message.date).toLocaleDateString() : ""}</time>
            </button>
          ))}
          {visibleMessages.length === 0 ? (
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
                <button
                  className={`icon-button ${activeMessage.flagged ? "active-icon" : ""}`}
                  title={activeMessage.flagged ? "Remove star" : "Star message"}
                  type="button"
                  onClick={() => void toggleFlag(activeMessage)}
                >
                  <Star size={16} />
                </button>
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
          <div className="composer-toolbar" aria-label="Composer formatting">
            <button type="button" title="Bold" onClick={() => formatRichText("bold")}>
              <Bold size={15} />
            </button>
            <button type="button" title="Italic" onClick={() => formatRichText("italic")}>
              <Italic size={15} />
            </button>
            <button type="button" title="Underline" onClick={() => formatRichText("underline")}>
              <Underline size={15} />
            </button>
            <button type="button" title="List" onClick={() => formatRichText("insertUnorderedList")}>
              <List size={15} />
            </button>
          </div>
          <div
            aria-label="Message body"
            className="rich-editor"
            contentEditable
            ref={editorRef}
            role="textbox"
            suppressContentEditableWarning
            onInput={updateComposeHtml}
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
          <div className="compose-actions">
            <button
              className="button secondary"
              disabled={!selected || isPending || (!compose.to && !compose.subject && !compose.text && !compose.html)}
              type="button"
              onClick={() => void saveDraft()}
            >
              <FileText size={18} />
              Save draft
            </button>
            <button
              className="button"
              disabled={!selected || !password || isPending || (!compose.text && !compose.html)}
              title={smtpDisconnected ? "Sending unavailable" : "Send message"}
            >
              <Send size={18} />
              Send
            </button>
          </div>
        </form>
      </section>

      {messageDeleteDialog ? (
        <ConfirmDialog
          danger
          title="Delete message"
          description={`Permanently delete "${messageDeleteDialog.subject}" from this mailbox?`}
          confirmLabel="Delete message"
          disabled={isPending}
          onCancel={() => setMessageDeleteDialog(null)}
          onConfirm={() => void confirmDeleteMessage()}
        />
      ) : null}
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

function emptyCompose(): ComposeState {
  return { to: "", subject: "", text: "", html: "" };
}

function buildDraftMessages(draftKey: string, draft: ComposeState): MailMessage[] {
  if (!draft.to && !draft.subject && !draft.text && !draft.html) {
    return [];
  }

  return [
    {
      id: `draft:${draftKey}`,
      from: "Draft",
      to: draft.to,
      subject: draft.subject || "(No subject)",
      date: null,
      seen: true,
      preview: draft.text || textFromHtml(draft.html),
    },
  ];
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

function textFromHtml(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sendErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (
    !message ||
    /unable to send|temporarily unavailable|service unavailable|mailbox service|workspace service|duplicate key|E11000|MongoDB/i.test(message)
  ) {
    return sendUnavailableMessage;
  }

  return message;
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
