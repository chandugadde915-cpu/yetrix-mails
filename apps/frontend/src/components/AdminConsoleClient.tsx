"use client";

import { AliasRow } from "@/components/AliasesClient";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { apiDelete, apiPost, apiPut } from "@/lib/client-api";
import { Domain, domainHealth, Mailbox } from "@/lib/platform-data";
import {
  AtSign,
  CheckCircle2,
  Copy,
  Crown,
  Inbox,
  KeyRound,
  MailPlus,
  Plus,
  Power,
  Route,
  ShieldAlert,
  Trash2,
  UsersRound,
} from "lucide-react";
import { FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export interface OperationResult {
  label: string;
  supported: boolean;
  data?: unknown;
  error?: string;
}

interface QuarantineItem {
  id: string;
  sender: string;
  recipient: string;
  subject: string;
  score: string;
}

export function AdminConsoleClient({
  domains,
  mailboxes,
  aliases,
  quarantine,
}: {
  domains: Domain[];
  mailboxes: Mailbox[];
  aliases: AliasRow[];
  quarantine: OperationResult | null;
}) {
  const router = useRouter();
  const verifiedDomains = useMemo(
    () => domains.filter((domain) => domainHealth(domain).healthy).map((domain) => domain.domain),
    [domains],
  );
  const activeMailboxes = useMemo(
    () => mailboxes.filter((mailbox) => mailbox.status === "active").map((mailbox) => mailbox.address),
    [mailboxes],
  );
  const [routes, setRoutes] = useState(aliases);
  const [notice, setNotice] = useState("");
  const [groupForm, setGroupForm] = useState({
    localPart: "team",
    domain: verifiedDomains[0] ?? domains[0]?.domain ?? "",
    members: activeMailboxes.slice(0, 2).join(", "),
  });
  const [catchAllForm, setCatchAllForm] = useState({
    domain: verifiedDomains[0] ?? domains[0]?.domain ?? "",
    destination: activeMailboxes[0] ?? "",
  });
  const [sharedForm, setSharedForm] = useState({
    localPart: "support",
    domain: verifiedDomains[0] ?? domains[0]?.domain ?? "",
    displayName: "Support Inbox",
    password: "",
    quotaMb: 5120,
  });
  const [dkimDomain, setDkimDomain] = useState(verifiedDomains[0] ?? domains[0]?.domain ?? "");
  const [dkimRecord, setDkimRecord] = useState("");
  const [routeDeleteDialog, setRouteDeleteDialog] = useState<{ route: AliasRow; confirmation: string } | null>(null);
  const [quarantineDeleteDialog, setQuarantineDeleteDialog] = useState<QuarantineItem | null>(null);
  const [isPending, startTransition] = useTransition();
  const classifiedRoutes = routes.map((route) => ({ ...route, type: routeType(route) }));
  const groups = classifiedRoutes.filter((route) => route.type === "Group").length;
  const catchAlls = classifiedRoutes.filter((route) => route.type === "Catch-all").length;
  const quarantineItems = useMemo(() => parseQuarantineItems(quarantine?.data), [quarantine]);

  function createGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const address = `${localPart(groupForm.localPart)}@${groupForm.domain}`;
    const members = normalizeMembers(groupForm.members);
    if (!members) {
      setNotice("Add at least one group member.");
      return;
    }

    mutate("Creating group", async () => {
      await apiPost("/api/aliases", { address, goto: members, active: true });
      setRoutes((current) => [...current, { id: address, address, goto: members, status: "active", active: true }]);
      setGroupForm((current) => ({ ...current, localPart: "", members: "" }));
    });
  }

  function createCatchAll(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!catchAllForm.domain || !catchAllForm.destination) {
      setNotice("Choose a domain and destination mailbox.");
      return;
    }

    const address = `@${catchAllForm.domain}`;
    mutate("Creating catch-all", async () => {
      await apiPost("/api/aliases", { address, goto: catchAllForm.destination, active: true });
      setRoutes((current) => [
        ...current,
        { id: address, address, goto: catchAllForm.destination, status: "active", active: true },
      ]);
    });
  }

  function createSharedMailbox(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = `${localPart(sharedForm.localPart)}@${sharedForm.domain}`;
    if (!sharedForm.password || sharedForm.password.length < 10) {
      setNotice("Shared mailbox password must be at least 10 characters.");
      return;
    }

    mutate("Creating shared mailbox", async () => {
      await apiPost("/api/mailboxes", {
        email,
        name: sharedForm.displayName,
        password: sharedForm.password,
        quotaMb: sharedForm.quotaMb,
        active: true,
      });
      setSharedForm((current) => ({ ...current, localPart: "", displayName: "", password: "" }));
      router.refresh();
    });
  }

  function generateDkim() {
    if (!dkimDomain) return;
    setNotice("");
    setDkimRecord("");
    startTransition(async () => {
      try {
        const result = await apiPost<OperationResult>(
          `/api/operations/dkim/${encodeURIComponent(dkimDomain)}`,
          {
            selector: "dkim",
            keySize: 2048,
          },
        );
        const record = extractDkimRecord(result.data, dkimDomain);
        setDkimRecord(record);
        setNotice(
          record.startsWith("v=DKIM1")
            ? "DKIM key generated. Copy the TXT value into DNS."
            : "DKIM generation requested. Refresh the domain records to copy the TXT value.",
        );
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Generating DKIM failed.");
      }
    });
  }

  function generateSharedPassword() {
    const password = createStrongPassword();
    setSharedForm((current) => ({ ...current, password }));
    setNotice("Shared mailbox password generated. Review it before creating the inbox.");
  }

  async function copyDkimRecord() {
    if (!dkimRecord || !dkimRecord.startsWith("v=DKIM1")) return;
    try {
      await navigator.clipboard.writeText(dkimRecord);
      setNotice("DKIM TXT value copied.");
    } catch {
      setNotice("Could not copy DKIM value.");
    }
  }

  function toggleRoute(route: AliasRow) {
    const active = route.status !== "active";
    mutate(active ? "Enabling route" : "Pausing route", async () => {
      await apiPut(`/api/aliases/${encodeURIComponent(route.id)}`, { active });
      setRoutes((current) =>
        current.map((item) =>
          item.id === route.id
            ? { ...item, active, status: active ? "active" : "disabled" }
            : item,
        ),
      );
    });
  }

  function confirmDeleteRoute() {
    if (!routeDeleteDialog || routeDeleteDialog.confirmation !== "DELETE") return;
    const route = routeDeleteDialog.route;

    mutate("Deleting route", async () => {
      await apiDelete(`/api/aliases/${encodeURIComponent(route.id)}`);
      setRoutes((current) => current.filter((item) => item.id !== route.id));
      setRouteDeleteDialog(null);
    });
  }

  function quarantineAction(item: QuarantineItem, action: "release" | "delete" | "learnham" | "learnspam") {
    if (action === "delete") {
      setQuarantineDeleteDialog(item);
      return;
    }

    mutate("Updating quarantine", async () => {
      await apiPost(`/api/operations/quarantine/${encodeURIComponent(item.id)}/${action}`, {});
      router.refresh();
    });
  }

  function confirmDeleteQuarantine() {
    if (!quarantineDeleteDialog) return;
    const item = quarantineDeleteDialog;
    mutate("Deleting quarantine item", async () => {
      await apiPost(`/api/operations/quarantine/${encodeURIComponent(item.id)}/delete`, {});
      setQuarantineDeleteDialog(null);
      router.refresh();
    });
  }

  function mutate(label: string, task: () => Promise<void>) {
    setNotice("");
    startTransition(async () => {
      try {
        await task();
        setNotice(`${label} completed.`);
      } catch (error) {
        setNotice(error instanceof Error ? error.message : `${label} failed.`);
      }
    });
  }

  return (
    <>
      <section className="admin-console-hero">
        <div>
          <div className="eyebrow light">
            <Crown size={16} />
            Admin console
          </div>
          <h2>Groups, shared inboxes, catch-all routing, signing, and quarantine.</h2>
        </div>
        <div className="admin-console-stats">
          <div>
            <strong>{groups}</strong>
            <span>groups</span>
          </div>
          <div>
            <strong>{catchAlls}</strong>
            <span>catch-all</span>
          </div>
          <div>
            <strong>{quarantineItems.length}</strong>
            <span>quarantine</span>
          </div>
        </div>
      </section>

      {notice ? <div className="notice">{notice}</div> : null}

      <section className="admin-console-grid section">
        <form className="panel admin-form" onSubmit={createGroup}>
          <div className="metric-row">
            <UsersRound size={20} />
            <div className="metric">Groups</div>
          </div>
          <div className="admin-address-row">
            <input
              aria-label="Group name"
              value={groupForm.localPart}
              onChange={(event) => setGroupForm({ ...groupForm, localPart: localPart(event.target.value) })}
              placeholder="team"
              required
            />
            <span>@</span>
            <select
              aria-label="Group domain"
              value={groupForm.domain}
              onChange={(event) => setGroupForm({ ...groupForm, domain: event.target.value })}
              required
            >
              {domainOptions(domains, verifiedDomains)}
            </select>
          </div>
          <textarea
            aria-label="Group members"
            value={groupForm.members}
            onChange={(event) => setGroupForm({ ...groupForm, members: event.target.value })}
            placeholder="admin@example.com, support@example.com"
            required
          />
          <button className="button" disabled={isPending || !groupForm.domain}>
            <Plus size={18} />
            Create group
          </button>
        </form>

        <form className="panel admin-form" onSubmit={createSharedMailbox}>
          <div className="metric-row">
            <Inbox size={20} />
            <div className="metric">Shared mailbox</div>
          </div>
          <div className="admin-address-row">
            <input
              aria-label="Shared mailbox name"
              value={sharedForm.localPart}
              onChange={(event) => setSharedForm({ ...sharedForm, localPart: localPart(event.target.value) })}
              placeholder="support"
              required
            />
            <span>@</span>
            <select
              aria-label="Shared mailbox domain"
              value={sharedForm.domain}
              onChange={(event) => setSharedForm({ ...sharedForm, domain: event.target.value })}
              required
            >
              {domainOptions(domains, verifiedDomains)}
            </select>
          </div>
          <input
            aria-label="Display name"
            value={sharedForm.displayName}
            onChange={(event) => setSharedForm({ ...sharedForm, displayName: event.target.value })}
            placeholder="Support Inbox"
            required
          />
          <div className="admin-password-row">
            <input
              aria-label="Shared mailbox password"
              type="text"
              value={sharedForm.password}
              onChange={(event) => setSharedForm({ ...sharedForm, password: event.target.value })}
              placeholder="Temporary password"
              minLength={10}
              required
            />
            <button
              className="button secondary"
              type="button"
              onClick={generateSharedPassword}
            >
              <KeyRound size={17} />
              Generate
            </button>
          </div>
          <button className="button" disabled={isPending || !sharedForm.domain}>
            <MailPlus size={18} />
            Create shared inbox
          </button>
        </form>

        <form className="panel admin-form" onSubmit={createCatchAll}>
          <div className="metric-row">
            <AtSign size={20} />
            <div className="metric">Catch-all</div>
          </div>
          <select
            aria-label="Catch-all domain"
            value={catchAllForm.domain}
            onChange={(event) => setCatchAllForm({ ...catchAllForm, domain: event.target.value })}
            required
          >
            {domainOptions(domains, verifiedDomains)}
          </select>
          <select
            aria-label="Catch-all destination"
            value={catchAllForm.destination}
            onChange={(event) => setCatchAllForm({ ...catchAllForm, destination: event.target.value })}
            required
          >
            {activeMailboxes.map((mailbox) => (
              <option key={mailbox} value={mailbox}>
                {mailbox}
              </option>
            ))}
            {activeMailboxes.length === 0 ? <option value="">Create a mailbox first</option> : null}
          </select>
          <button className="button" disabled={isPending || !catchAllForm.destination}>
            <Route size={18} />
            Create catch-all
          </button>
        </form>

        <div className="panel admin-form">
          <div className="metric-row">
            <KeyRound size={20} />
            <div className="metric">DKIM</div>
          </div>
          <select
            aria-label="DKIM domain"
            value={dkimDomain}
            onChange={(event) => setDkimDomain(event.target.value)}
          >
            {domainOptions(domains, verifiedDomains)}
          </select>
          <button className="button" disabled={isPending || !dkimDomain} onClick={generateDkim}>
            <KeyRound size={18} />
            Generate key
          </button>
          {dkimRecord ? (
            <div className="dkim-output">
              <span>{dkimRecord.startsWith("v=DKIM1") ? "TXT value" : "Next step"}</span>
              <code>{dkimRecord}</code>
              {dkimRecord.startsWith("v=DKIM1") ? (
                <button className="icon-button" title="Copy DKIM TXT value" onClick={copyDkimRecord}>
                  <Copy size={16} />
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      <section className="panel section">
        <div className="split-row">
          <div className="title">
            <h1>Routing Rules</h1>
            <p>Groups, forwards, catch-all routes, and shared inbox routes.</p>
          </div>
          <span className="badge good">{classifiedRoutes.length} rules</span>
        </div>
        <div className="admin-route-list">
          {classifiedRoutes.map((route) => (
            <div className="admin-route-row" key={route.id || route.address}>
              <span className={`routing-type ${route.type.toLowerCase().replace(/[^a-z]/g, "-")}`}>
                {route.type}
              </span>
              <strong>{route.address}</strong>
              <span>{route.goto}</span>
              <span className={`badge ${route.status === "active" ? "good" : "warn"}`}>{route.status}</span>
              <button
                className="icon-button tooltip-button"
                data-tooltip={route.status === "active" ? "Pause route" : "Enable route"}
                title={route.status === "active" ? "Pause" : "Enable"}
                onClick={() => toggleRoute(route)}
              >
                <Power size={16} />
              </button>
              <button
                className="icon-button danger-icon tooltip-button"
                data-tooltip="Delete route"
                title="Delete"
                onClick={() => setRouteDeleteDialog({ route, confirmation: "" })}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {classifiedRoutes.length === 0 ? <div className="muted-text">No routing rules found.</div> : null}
        </div>
      </section>

      <section className="panel section">
        <div className="split-row">
          <div className="title">
            <h1>Quarantine</h1>
            <p>Review held messages and apply safe actions.</p>
          </div>
          <span className="badge warn">{quarantineItems.length} held</span>
        </div>
        <div className="quarantine-list">
          {quarantineItems.map((item) => (
            <div className="quarantine-row" key={item.id}>
              <ShieldAlert size={18} />
              <span>
                <strong>{item.subject}</strong>
                <small>
                  {item.sender} to {item.recipient}
                </small>
              </span>
              <span className="badge warn">{item.score}</span>
              <button className="button secondary" onClick={() => quarantineAction(item, "release")}>
                <CheckCircle2 size={16} />
                Release
              </button>
              <button className="button secondary" onClick={() => quarantineAction(item, "learnham")}>
                Allow
              </button>
              <button className="button danger" onClick={() => quarantineAction(item, "delete")}>
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          ))}
          {quarantineItems.length === 0 ? <div className="muted-text">No quarantine items found.</div> : null}
        </div>
      </section>

      {routeDeleteDialog ? (
        <ConfirmDialog
          danger
          title="Delete route"
          description={`This removes ${routeDeleteDialog.route.address}. Type DELETE to confirm.`}
          confirmLabel="Delete route"
          disabled={isPending || routeDeleteDialog.confirmation !== "DELETE"}
          onCancel={() => setRouteDeleteDialog(null)}
          onConfirm={confirmDeleteRoute}
        >
          <label>
            Confirmation
            <input
              autoFocus
              value={routeDeleteDialog.confirmation}
              onChange={(event) =>
                setRouteDeleteDialog({ ...routeDeleteDialog, confirmation: event.target.value })
              }
            />
          </label>
        </ConfirmDialog>
      ) : null}

      {quarantineDeleteDialog ? (
        <ConfirmDialog
          danger
          title="Delete held message"
          description={`Delete quarantined message "${quarantineDeleteDialog.subject}"?`}
          confirmLabel="Delete message"
          disabled={isPending}
          onCancel={() => setQuarantineDeleteDialog(null)}
          onConfirm={confirmDeleteQuarantine}
        />
      ) : null}
    </>
  );
}

function routeType(route: AliasRow) {
  if (route.address.startsWith("@")) return "Catch-all";
  if (route.goto.split(",").filter(Boolean).length > 1) return "Group";
  if (/^(support|sales|info|billing|help|team)@/i.test(route.address)) return "Shared";
  return "Forward";
}

function normalizeMembers(value: string) {
  return value
    .split(/[,\n]/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .join(",");
}

function localPart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9._%+-]+/g, ".")
    .replace(/\.{2,}/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 64);
}

function domainOptions(domains: Domain[], verifiedDomains: string[]) {
  const verified = new Set(verifiedDomains);
  return domains.map((domain) => (
    <option disabled={!verified.has(domain.domain)} key={domain.domain} value={domain.domain}>
      {domain.domain}
    </option>
  ));
}

function createStrongPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const symbols = "!@$%*?";
  const bytes = new Uint32Array(14);
  window.crypto.getRandomValues(bytes);
  const body = Array.from(bytes, (value) => alphabet[value % alphabet.length]).join("");
  return `${body}${symbols[bytes[0] % symbols.length]}${bytes[1] % 10}`;
}

function extractDkimRecord(value: unknown, domain: string) {
  const text = stringifyOperation(value);
  const match = text.match(/v=DKIM1[^"\\]+/i);
  if (match?.[0]) {
    return match[0].replace(/\\n/g, "").trim();
  }

  return `DKIM request accepted for ${domain}. Open Domains and refresh DNS records to copy the published TXT value.`;
}

function stringifyOperation(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

function parseQuarantineItems(value: unknown): QuarantineItem[] {
  const rows = objectRows(value);
  return rows
    .map((row) => ({
      id: String(row.id ?? row.qid ?? row.qhash ?? ""),
      sender: String(row.sender ?? row.from ?? "Unknown sender"),
      recipient: String(row.rcpt ?? row.recipient ?? row.to ?? "Unknown recipient"),
      subject: String(row.subject ?? "(No subject)"),
      score: String(row.score ?? row.symbols_score ?? "Held"),
    }))
    .filter((row) => row.id);
}

function objectRows(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) {
    return value.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"));
  }

  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).flatMap(objectRows);
  }

  return [];
}
