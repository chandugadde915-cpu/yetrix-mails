"use client";

import { apiPost } from "@/lib/client-api";
import { formatDateTime } from "@/lib/platform-data";
import { Activity, CheckCircle2, KeyRound, Route, ShieldAlert } from "lucide-react";
import { useMemo, useState, useTransition } from "react";

export interface OperationResult {
  label: string;
  supported: boolean;
  data?: unknown;
  error?: string;
}

interface DeliveryLogEntry {
  time: string;
  severity: "ok" | "attention" | "info" | string;
  event: string;
}

interface DeliveryLogGroup {
  service: string;
  entries: DeliveryLogEntry[];
  note?: string;
}

export interface OperationsSummary {
  status?: { connected?: boolean; error?: string };
  counts?: { domains: number; mailboxes: number; aliases: number };
  capabilities?: string[];
}

export interface RoutingData {
  domains: Array<{ domain: string; status?: string }>;
  mailboxes: Array<{ address: string; status?: string }>;
  aliases: Array<{ address: string; goto: string; status?: string }>;
}

export function OperationsClient({
  summary,
  routing,
  logs,
  quarantine,
}: {
  summary: OperationsSummary;
  routing: RoutingData;
  logs: OperationResult[];
  quarantine: OperationResult | null;
}) {
  const domains = useMemo(() => routing.domains.map((item) => item.domain), [routing.domains]);
  const deliveryLogs = useMemo(() => logs.map(toDeliveryLogGroup), [logs]);
  const [selectedDomain, setSelectedDomain] = useState(domains[0] ?? "");
  const [dkimResult, setDkimResult] = useState("");
  const [isPending, startTransition] = useTransition();

  function generateDkim() {
    if (!selectedDomain) return;
    setDkimResult("");
    startTransition(async () => {
      try {
        const result = await apiPost<OperationResult>(
          `/api/operations/dkim/${encodeURIComponent(selectedDomain)}`,
          { selector: "dkim", keySize: 2048 },
        );
        setDkimResult(result.supported ? "DKIM generation requested." : result.error ?? "DKIM is not available.");
      } catch (error) {
        setDkimResult(error instanceof Error ? error.message : "DKIM request failed.");
      }
    });
  }

  return (
    <>
      <section className="operations-hero">
        <div>
          <div className="eyebrow light">
            <Activity size={16} />
            Mail operations control
          </div>
          <h2>One cockpit for signing, routing, quarantine, and delivery signals.</h2>
          <p>
            Keep domain signing, routing, quarantine checks, and delivery activity organized for
            every workspace.
          </p>
        </div>
        <div className="operation-radar" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </section>

      <section className="metric-grid">
        <div className="panel">
          <div className="metric">Mail service</div>
          <div className="value small-value">{summary.status?.connected ? "Online" : "Check"}</div>
        </div>
        <div className="panel">
          <div className="metric">Domains</div>
          <div className="value small-value">{summary.counts?.domains ?? 0}</div>
        </div>
        <div className="panel">
          <div className="metric">Mailboxes</div>
          <div className="value small-value">{summary.counts?.mailboxes ?? 0}</div>
        </div>
        <div className="panel">
          <div className="metric">Aliases</div>
          <div className="value small-value">{summary.counts?.aliases ?? 0}</div>
        </div>
      </section>

      <section className="operations-grid section">
        <div className="panel wide-panel">
          <div className="metric-row">
            <KeyRound size={20} />
            <div className="metric">DKIM</div>
          </div>
          <div className="operation-form">
            <select value={selectedDomain} onChange={(event) => setSelectedDomain(event.target.value)}>
              {domains.map((domain) => (
                <option key={domain} value={domain}>
                  {domain}
                </option>
              ))}
            </select>
            <button className="button" disabled={!selectedDomain || isPending} onClick={generateDkim}>
              <KeyRound size={18} />
              Generate key
            </button>
          </div>
          {dkimResult ? <div className="notice">{dkimResult}</div> : null}
        </div>

        <div className="panel">
          <div className="metric-row">
            <CheckCircle2 size={20} />
            <div className="metric">Service capabilities</div>
          </div>
          <div className="capability-list">
            {(summary.capabilities ?? []).map((capability) => (
              <div key={capability}>
                <CheckCircle2 size={16} />
                <span>{capability}</span>
              </div>
            ))}
            {(summary.capabilities ?? []).length === 0 ? (
              <div>
                <ShieldAlert size={16} />
                <span>Capability data unavailable</span>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="operations-grid section">
        <div className="panel">
          <div className="metric-row">
            <ShieldAlert size={20} />
            <div className="metric">Quarantine</div>
          </div>
          <div className="operation-note">
            {quarantine?.supported
              ? "Quarantine connection is available. Review and release held messages from Admin Console."
              : "Quarantine data is not available yet."}
          </div>
        </div>
      </section>

      <section className="panel section">
        <div className="metric-row">
          <Route size={20} />
          <div className="metric">Routing Inventory</div>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Source</th>
              <th>Destination</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {routing.mailboxes.map((mailbox) => (
              <tr key={mailbox.address}>
                <td>Mailbox</td>
                <td>{mailbox.address}</td>
                <td>Local mailbox</td>
                <td>{mailbox.status ?? "active"}</td>
              </tr>
            ))}
            {routing.aliases.map((alias) => (
              <tr key={alias.address}>
                <td>Alias</td>
                <td>{alias.address}</td>
                <td>{alias.goto}</td>
                <td>{alias.status ?? "active"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel section">
        <div className="metric-row">
          <Activity size={20} />
          <div className="metric">Delivery Logs</div>
        </div>
        <div className="log-grid">
          {deliveryLogs.map((log) => (
            <div className="log-panel" key={log.service}>
              <div className="split-row compact">
                <strong>{log.service}</strong>
                <span className="badge good">{log.entries.length} events</span>
              </div>
              <p>{log.note ?? "Sanitized delivery events for this workspace."}</p>
              {log.entries.length > 0 ? (
                <table className="log-table">
                  <tbody>
                    {log.entries.map((entry, index) => (
                      <tr key={`${log.service}-${entry.time}-${index}`}>
                        <td>{formatDateTime(entry.time)}</td>
                        <td>
                          <span className={`badge ${entry.severity === "attention" ? "warn" : "good"}`}>
                            {entry.severity === "attention" ? "Review" : entry.severity}
                          </span>
                        </td>
                        <td>{entry.event}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="muted-text">No recent delivery events found.</div>
              )}
            </div>
          ))}
          {logs.length === 0 ? <div className="muted-text">No delivery activity found.</div> : null}
        </div>
      </section>
    </>
  );
}

function toDeliveryLogGroup(log: OperationResult): DeliveryLogGroup {
  if (!log.supported) {
    return {
      service: log.label,
      entries: [],
      note: "Report is not available yet.",
    };
  }

  if (isDeliveryLogGroup(log.data)) {
    return {
      service: log.data.service || log.label,
      entries: log.data.entries ?? [],
      note: log.data.note,
    };
  }

  return {
    service: log.label,
    entries: [],
    note: "No sanitized events were returned for this service.",
  };
}

function isDeliveryLogGroup(value: unknown): value is DeliveryLogGroup {
  return Boolean(value && typeof value === "object" && Array.isArray((value as DeliveryLogGroup).entries));
}
