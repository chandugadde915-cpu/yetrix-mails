"use client";

import { apiDelete, apiPost, apiPut } from "@/lib/client-api";
import { Domain, domainHealth, formatStorage, Mailbox, usagePercent } from "@/lib/platform-data";
import {
  AtSign,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  HardDrive,
  KeyRound,
  Mail,
  Plus,
  Power,
  Save,
  ShieldCheck,
  Trash2,
  UserPlus,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const quotaPlans = [
  { label: "Starter", value: 1024, detail: "1 GB" },
  { label: "Business", value: 5120, detail: "5 GB" },
  { label: "Executive", value: 10240, detail: "10 GB" },
  { label: "Custom", value: 0, detail: "Manual" },
];

export function MailboxesClient({
  initialMailboxes,
  domains,
}: {
  initialMailboxes: Mailbox[];
  domains: Domain[];
}) {
  const router = useRouter();
  const domainOptions = useMemo(
    () =>
      domains.map((domain) => ({
        domain: domain.domain,
        verified: domainHealth(domain).healthy,
      })),
    [domains],
  );
  const verifiedDomainOptions = useMemo(
    () => domainOptions.filter((domain) => domain.verified).map((domain) => domain.domain),
    [domainOptions],
  );
  const [mailboxes, setMailboxes] = useState(initialMailboxes);
  const [quotaDrafts, setQuotaDrafts] = useState<Record<string, number>>(() =>
    Object.fromEntries(initialMailboxes.map((mailbox) => [mailbox.address, mailbox.quotaMb ?? 0])),
  );
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    displayName: "",
    localPart: "",
    domain: verifiedDomainOptions[0] ?? domainOptions[0]?.domain ?? "yetrixtechnologies.com",
    password: "",
    quotaMb: 5120,
    plan: 5120,
    active: true,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const activeCount = mailboxes.filter((mailbox) => mailbox.status === "active").length;
  const disabledCount = mailboxes.length - activeCount;
  const storageUsed = mailboxes.reduce((total, mailbox) => total + (mailbox.usedMb ?? 0), 0);
  const storageLimit = mailboxes.reduce((total, mailbox) => total + (mailbox.quotaMb ?? 0), 0);
  const mailboxAddress = `${form.localPart.trim().toLowerCase() || "user"}@${form.domain}`;
  const passwordScore = passwordStrength(form.password);
  const hasVerifiedDomain = verifiedDomainOptions.length > 0;
  const selectedDomainVerified = domainOptions.some(
    (domain) => domain.domain === form.domain && domain.verified,
  );

  useEffect(() => {
    setMailboxes(initialMailboxes);
    setQuotaDrafts(
      Object.fromEntries(initialMailboxes.map((mailbox) => [mailbox.address, mailbox.quotaMb ?? 0])),
    );
  }, [initialMailboxes]);

  useEffect(() => {
    const preferredDomain = verifiedDomainOptions[0] ?? domainOptions[0]?.domain;
    if (preferredDomain && !domainOptions.some((domain) => domain.domain === form.domain)) {
      setForm((current) => ({ ...current, domain: preferredDomain }));
    }
  }, [domainOptions, form.domain, verifiedDomainOptions]);

  async function createMailbox(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (!selectedDomainVerified) {
      setMessage("Verify domain DNS before creating production mailboxes.");
      return;
    }

    const email = `${form.localPart.trim().toLowerCase()}@${form.domain}`;
    try {
      await apiPost("/api/mailboxes", {
        email,
        name: form.displayName || fullName(form.firstName, form.lastName) || form.localPart,
        password: form.password,
        quotaMb: form.quotaMb,
        active: form.active,
      });
      setMessage(`${email} created. The user can sign in from Mailbox login.`);
      setForm((current) => ({
        ...current,
        firstName: "",
        lastName: "",
        displayName: "",
        localPart: "",
        password: "",
        quotaMb: 5120,
        plan: 5120,
        active: true,
      }));
      startTransition(() => router.refresh());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create mailbox.");
    }
  }

  function updatePerson(field: "firstName" | "lastName", value: string) {
    const next = { ...form, [field]: value };
    const previousAutoName = fullName(form.firstName, form.lastName);
    const nextAutoName = fullName(next.firstName, next.lastName);
    const previousAutoLocal = emailLocalPart(form.firstName, form.lastName);
    const nextAutoLocal = emailLocalPart(next.firstName, next.lastName);

    setForm({
      ...next,
      displayName:
        !form.displayName || form.displayName === previousAutoName
          ? nextAutoName
          : form.displayName,
      localPart:
        !form.localPart || form.localPart === previousAutoLocal
          ? nextAutoLocal
          : form.localPart,
    });
  }

  function applyQuotaPlan(value: number) {
    setForm((current) => ({
      ...current,
      plan: value,
      quotaMb: value > 0 ? value : current.quotaMb,
    }));
  }

  function generatePassword() {
    const password = createStrongPassword();
    setForm((current) => ({ ...current, password }));
    setShowPassword(true);
  }

  async function copyMailboxAddress() {
    try {
      await navigator.clipboard.writeText(mailboxAddress);
      setMessage("Mailbox address copied.");
    } catch {
      setMessage("Could not copy mailbox address.");
    }
  }

  async function updateQuota(email: string, quotaMb: number) {
    try {
      await apiPut(`/api/mailboxes/${encodeURIComponent(email)}`, { quotaMb });
      setMailboxes((current) =>
        current.map((mailbox) => (mailbox.address === email ? { ...mailbox, quotaMb } : mailbox)),
      );
      setMessage(`Quota updated for ${email}.`);
      startTransition(() => router.refresh());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `Could not update ${email}.`);
    }
  }

  async function resetPassword(email: string) {
    const password = window.prompt("New password, minimum 10 characters");
    if (!password) return;
    try {
      await apiPost(`/api/mailboxes/${encodeURIComponent(email)}/password`, { password });
      setMessage(`Password reset for ${email}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `Could not reset ${email}.`);
    }
  }

  async function setActive(email: string, active: boolean) {
    try {
      await apiPost(`/api/mailboxes/${encodeURIComponent(email)}/${active ? "enable" : "disable"}`, {});
      setMessage(`${email} ${active ? "enabled" : "disabled"}.`);
      startTransition(() => router.refresh());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `Could not update ${email}.`);
    }
  }

  async function deleteMailbox(email: string) {
    if (!window.confirm(`Delete ${email}?`)) return;

    try {
      await apiDelete(`/api/mailboxes/${encodeURIComponent(email)}`);
      setMailboxes((current) => current.filter((mailbox) => mailbox.address !== email));
      setMessage(`${email} deleted.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `Could not delete ${email}.`);
    }
  }

  return (
    <>
      <section className="mailbox-command">
        <div>
          <div className="eyebrow light">
            <UserPlus size={16} />
            User provisioning
          </div>
          <h2>Create real mailbox users, control access, and hand them a working webmail login.</h2>
          <p>
            Each mailbox becomes available in the Yetrix mail workspace and can be used by the
            owner on webmail and mobile mail apps.
          </p>
        </div>
        <div className="mailbox-lifecycle">
          <div className="lifecycle-step active">
            <span>01</span>
            <strong>Create</strong>
          </div>
          <div className="lifecycle-step">
            <span>02</span>
            <strong>Quota</strong>
          </div>
          <div className="lifecycle-step">
            <span>03</span>
            <strong>Access</strong>
          </div>
          <div className="lifecycle-step">
            <span>04</span>
            <strong>Webmail</strong>
          </div>
        </div>
        <div className="mailbox-stats">
          <div>
            <ShieldCheck size={18} />
            <span>Active</span>
            <strong>{activeCount}</strong>
          </div>
          <div>
            <Power size={18} />
            <span>Disabled</span>
            <strong>{disabledCount}</strong>
          </div>
          <div>
            <HardDrive size={18} />
            <span>Storage</span>
            <strong>
              {formatStorage(storageUsed)} / {formatStorage(storageLimit)}
            </strong>
          </div>
        </div>
      </section>

      <section className="mailbox-create-suite" id="mailbox-create">
        <form className="outlook-create-panel" onSubmit={createMailbox}>
          <div className="create-panel-head">
            <div>
              <span className="eyebrow light">
                <AtSign size={15} />
                New mailbox
              </span>
              <h2>Create a business mailbox</h2>
            </div>
            <span className={`badge ${selectedDomainVerified ? "good" : "warn"}`}>
              {selectedDomainVerified ? "Domain ready" : "DNS pending"}
            </span>
          </div>

          <div className="creation-section">
            <div className="section-number">1</div>
            <div>
              <h3>Identity</h3>
              <div className="creation-grid two">
                <label>
                  First name
                  <input
                    value={form.firstName}
                    onChange={(event) => updatePerson("firstName", event.target.value)}
                    placeholder="Aarav"
                  />
                </label>
                <label>
                  Last name
                  <input
                    value={form.lastName}
                    onChange={(event) => updatePerson("lastName", event.target.value)}
                    placeholder="Sharma"
                  />
                </label>
              </div>
              <label>
                Display name
                <input
                  value={form.displayName}
                  onChange={(event) => setForm({ ...form, displayName: event.target.value })}
                  placeholder="Aarav Sharma"
                />
              </label>
            </div>
          </div>

          <div className="creation-section">
            <div className="section-number">2</div>
            <div>
              <h3>Email address</h3>
              <div className="mail-address-builder">
                <input
                  aria-label="Mailbox username"
                  placeholder="user"
                  value={form.localPart}
                  onChange={(event) =>
                    setForm({ ...form, localPart: emailLocalPart(event.target.value) })
                  }
                  pattern="^[a-zA-Z0-9._%+-]+$"
                  required
                />
                <span>@</span>
                <select
                  aria-label="Mailbox domain"
                  value={form.domain}
                  onChange={(event) => setForm({ ...form, domain: event.target.value })}
                  required
                >
                  {domainOptions.map((domain) => (
                    <option disabled={!domain.verified} key={domain.domain} value={domain.domain}>
                      {domain.domain} {domain.verified ? "" : "(verify DNS first)"}
                    </option>
                  ))}
                  {domainOptions.length === 0 ? (
                    <option value="yetrixtechnologies.com">yetrixtechnologies.com</option>
                  ) : null}
                </select>
              </div>
            </div>
          </div>

          <div className="creation-section">
            <div className="section-number">3</div>
            <div>
              <h3>Password and storage</h3>
              <div className="password-row">
                <input
                  aria-label="Mailbox password"
                  placeholder="Temporary password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                  minLength={10}
                  required
                />
                <button
                  className="icon-button"
                  type="button"
                  title={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <button className="button secondary" type="button" onClick={generatePassword}>
                  <KeyRound size={17} />
                  Generate
                </button>
              </div>
              <div className="password-meter">
                <span style={{ width: `${passwordScore}%` }} />
              </div>
              <div className="quota-plan-row">
                {quotaPlans.map((plan) => (
                  <button
                    className={form.plan === plan.value ? "active" : ""}
                    key={plan.label}
                    type="button"
                    onClick={() => applyQuotaPlan(plan.value)}
                  >
                    <strong>{plan.label}</strong>
                    <span>{plan.detail}</span>
                  </button>
                ))}
              </div>
              <label>
                Quota in MB
                <input
                  aria-label="Mailbox quota in MB"
                  min={128}
                  max={102400}
                  type="number"
                  value={form.quotaMb}
                  onChange={(event) =>
                    setForm({ ...form, quotaMb: Number(event.target.value), plan: 0 })
                  }
                />
              </label>
            </div>
          </div>

          <label className="create-toggle">
            <input
              checked={form.active}
              type="checkbox"
              onChange={(event) => setForm({ ...form, active: event.target.checked })}
            />
            Enable mailbox immediately
          </label>

          <div className="create-footer">
            <button
              className="button"
              disabled={isPending || !selectedDomainVerified || !form.localPart || !form.password}
            >
              <Plus size={18} />
              Create mailbox
            </button>
            <a className="button secondary" href="/mail-login">
              <Mail size={18} />
              Mailbox login
            </a>
          </div>
        </form>

        <aside className="mailbox-preview-panel">
          <div className="preview-top">
            <span className="mailbox-avatar">{initials(form.displayName || mailboxAddress)}</span>
            <button className="icon-button" type="button" title="Copy address" onClick={copyMailboxAddress}>
              <Copy size={16} />
            </button>
          </div>
          <h2>{form.displayName || "New mailbox user"}</h2>
          <p className="mono">{mailboxAddress}</p>
          <div className="preview-list">
            <div>
              <span>Domain</span>
              <strong>{selectedDomainVerified ? "Verified" : "Pending DNS"}</strong>
            </div>
            <div>
              <span>Quota</span>
              <strong>{formatStorage(form.quotaMb)}</strong>
            </div>
            <div>
              <span>Status</span>
              <strong>{form.active ? "Enabled" : "Disabled"}</strong>
            </div>
            <div>
              <span>Access</span>
              <strong>Mailbox login</strong>
            </div>
          </div>
          <div className="preview-checks">
            <div className={selectedDomainVerified ? "ready" : ""}>
              <CheckCircle2 size={16} />
              <span>DNS verified</span>
            </div>
            <div className={form.password.length >= 10 ? "ready" : ""}>
              <CheckCircle2 size={16} />
              <span>Password ready</span>
            </div>
            <div className={form.localPart ? "ready" : ""}>
              <CheckCircle2 size={16} />
              <span>Email address ready</span>
            </div>
          </div>
        </aside>
      </section>
      {!hasVerifiedDomain ? (
        <div className="notice warn-notice">Verify a domain before creating production mailboxes.</div>
      ) : null}
      {message ? <div className="notice">{message}</div> : null}

      <section className="panel mailbox-table-panel">
        <div className="split-row">
          <div className="title">
            <h1>Mailbox Directory</h1>
            <p>Reset passwords, update quotas, disable users, or open the separate mailbox login.</p>
          </div>
          <span className="badge good">{mailboxes.length} total</span>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Name</th>
              <th>Quota</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {mailboxes.map((mailbox) => (
              <tr key={mailbox.address}>
                <td>{mailbox.address}</td>
                <td>{mailbox.name}</td>
                <td>
                  <div className="quota-cell">
                    <span>
                      {formatStorage(mailbox.usedMb ?? 0)} / {formatStorage(mailbox.quotaMb ?? 0)}
                    </span>
                    <div className="progress">
                      <span style={{ width: `${usagePercent(mailbox.usedMb ?? 0, mailbox.quotaMb ?? 1)}%` }} />
                    </div>
                    <input
                      aria-label={`Quota for ${mailbox.address}`}
                      className="quota-input"
                      min={128}
                      max={102400}
                      type="number"
                      value={quotaDrafts[mailbox.address] ?? mailbox.quotaMb ?? 0}
                      onChange={(event) =>
                        setQuotaDrafts((current) => ({
                          ...current,
                          [mailbox.address]: Number(event.target.value),
                        }))
                      }
                    />
                  </div>
                </td>
                <td>
                  <span className={`badge ${mailbox.status === "active" ? "good" : "warn"}`}>
                    {mailbox.status}
                  </span>
                </td>
                <td>
                  <div className="table-actions">
                    <button
                      className="icon-button"
                      title="Save quota"
                      onClick={() =>
                        void updateQuota(
                          mailbox.address,
                          quotaDrafts[mailbox.address] ?? mailbox.quotaMb ?? 0,
                        )
                      }
                    >
                      <Save size={16} />
                    </button>
                    <button
                      className="icon-button"
                      title="Reset password"
                      onClick={() => void resetPassword(mailbox.address)}
                    >
                      <KeyRound size={16} />
                    </button>
                    <button
                      className="icon-button"
                      title={mailbox.status === "active" ? "Disable" : "Enable"}
                      onClick={() => void setActive(mailbox.address, mailbox.status !== "active")}
                    >
                      <Power size={16} />
                    </button>
                    <a className="icon-button" href="/mail-login" title="Open mailbox login">
                      <Mail size={16} />
                    </a>
                    <button
                      className="icon-button danger-icon"
                      title="Delete"
                      onClick={() => void deleteMailbox(mailbox.address)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {mailboxes.length === 0 ? (
              <tr>
                <td colSpan={5}>No mailboxes yet. Create the first address above.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </>
  );
}

function fullName(firstName: string, lastName: string) {
  return [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
}

function emailLocalPart(...parts: string[]) {
  return parts
    .join(".")
    .toLowerCase()
    .replace(/[^a-z0-9._%+-]+/g, ".")
    .replace(/\.{2,}/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 64);
}

function createStrongPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const symbols = "!@$%*?";
  const bytes = new Uint32Array(14);
  window.crypto.getRandomValues(bytes);
  const body = Array.from(bytes, (value) => alphabet[value % alphabet.length]).join("");
  return `${body}${symbols[bytes[0] % symbols.length]}${bytes[1] % 10}`;
}

function passwordStrength(password: string) {
  let score = 0;
  if (password.length >= 10) score += 30;
  if (password.length >= 14) score += 20;
  if (/[A-Z]/.test(password)) score += 15;
  if (/[a-z]/.test(password)) score += 15;
  if (/\d/.test(password)) score += 10;
  if (/[^A-Za-z0-9]/.test(password)) score += 10;
  return Math.min(100, score);
}

function initials(value: string) {
  return value
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
