import { AppShell } from "@/components/AppShell";
import { getDummyData } from "@/lib/dummy-data";
import { CheckCircle2, Clock3, Copy, Globe2, RefreshCw, ShieldCheck } from "lucide-react";

export default function DomainsPage() {
  const { domains } = getDummyData();
  const verifiedDomains = domains.filter((domain) => domain.status === "active").length;
  const missingRecords = domains.flatMap((domain) =>
    domain.records.filter((record) => record.status !== "verified"),
  ).length;

  return (
    <AppShell>
      <div className="topbar">
        <div className="title">
          <h1>Domains</h1>
          <p>Add customer domains and verify mail DNS records.</p>
        </div>
        <button className="button">
          <RefreshCw size={18} />
          Check records
        </button>
      </div>

      <section className="domain-command">
        <div className="domain-command-copy">
          <div className="eyebrow light">
            <ShieldCheck size={16} />
            DNS command center
          </div>
          <h2>Verify ownership, secure sending, and route mail from one place.</h2>
          <p>
            Dummy data is powering this view today. Tomorrow the same layout can read live DNS,
            DKIM, SPF, DMARC, and mailbox status from your AWS backend.
          </p>
        </div>
        <div className="domain-scoreboard">
          <div>
            <strong>{verifiedDomains}</strong>
            <span>verified</span>
          </div>
          <div>
            <strong>{domains.length}</strong>
            <span>domains</span>
          </div>
          <div>
            <strong>{missingRecords}</strong>
            <span>missing records</span>
          </div>
        </div>
      </section>

      <section className="domain-board">
        {domains.map((domain) => (
          <article className="domain-card" key={domain.domain}>
            <div className="domain-orbit" aria-hidden="true">
              <span className={domain.status === "active" ? "online" : "pending"} />
              <span />
              <span />
            </div>

            <div className="domain-card-head">
              <div>
                <div className="domain-kicker">
                  <Globe2 size={16} />
                  {domain.status === "active" ? "Receiving mail" : "Waiting for DNS"}
                </div>
                <h2>{domain.domain}</h2>
                <p>
                  {domain.mailboxes} mailboxes · Added {domain.createdAt}
                </p>
              </div>
              <div className={`domain-status-pill ${domain.status === "active" ? "good" : "warn"}`}>
                {domain.status === "active" ? <CheckCircle2 size={16} /> : <Clock3 size={16} />}
                {domain.status === "active" ? "Verified" : "Pending"}
              </div>
            </div>

            <div className="domain-route" aria-hidden="true">
              <span>Customer DNS</span>
              <div>
                <i />
                <i />
                <i />
              </div>
              <span>Yetrix Mail</span>
            </div>

            <div className="dns-stack">
              {domain.records.map((record) => (
                <div className="dns-record" key={`${domain.domain}-${record.type}-${record.name}`}>
                  <div className={`dns-type ${record.status === "verified" ? "good" : "warn"}`}>
                    {record.type}
                  </div>
                  <div className="dns-record-body">
                    <div className="record-line">
                      <span className="mono">{record.name}</span>
                      <span
                        className={`record-state ${record.status === "verified" ? "good" : "warn"}`}
                      >
                        {record.status === "verified" ? "Verified" : "Missing"}
                      </span>
                    </div>
                    <div className="dns-value">
                      <span className="mono">{record.value}</span>
                      <Copy size={15} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>
    </AppShell>
  );
}
