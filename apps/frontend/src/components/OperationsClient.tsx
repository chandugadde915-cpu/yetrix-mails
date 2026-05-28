"use client";

import { apiPost } from "@/lib/client-api";
import { Activity, CheckCircle2, KeyRound, Route, ShieldAlert } from "lucide-react";
import { useMemo, useState, useTransition } from "react";

export interface OperationResult {
  label: string;
  supported: boolean;
  data?: unknown;
  error?: string;
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
            Yetrix keeps Mailcow behind the backend and exposes clean tenant-safe controls for
            production operators.
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
          <div className="metric">Mail engine</div>
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
            <div className="metric">Backend capabilities</div>
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
          <pre className="operation-output">
            {quarantine?.supported
              ? JSON.stringify(quarantine.data, null, 2)
              : quarantine?.error ?? "Quarantine API is not available yet."}
          </pre>
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
          {logs.map((log) => (
            <div className="log-panel" key={log.label}>
              <strong>{log.label}</strong>
              <pre>{log.supported ? JSON.stringify(log.data, null, 2) : log.error}</pre>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
