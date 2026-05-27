import { AppShell } from "@/components/AppShell";
import { getDummyData } from "@/lib/dummy-data";
import { RefreshCw } from "lucide-react";

export default function DomainsPage() {
  const { domains } = getDummyData();

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

      <section className="domain-grid">
        {domains.map((domain) => (
          <article className="panel" key={domain.domain}>
            <div className="domain-card-head">
              <div>
                <h2>{domain.domain}</h2>
                <p>{domain.mailboxes} mailboxes</p>
              </div>
              <span className={`badge ${domain.status === "active" ? "good" : "warn"}`}>
                {domain.status === "active" ? "Verified" : "Pending DNS"}
              </span>
            </div>
            <div className="records">
              {domain.records.map((record) => (
                <div className="record" key={`${domain.domain}-${record.type}-${record.name}`}>
                  <strong>{record.type}</strong>
                  <div>
                    <div className="record-line">
                      <span className="mono">{record.name}</span>
                      <span className={`badge ${record.status === "verified" ? "good" : "warn"}`}>
                        {record.status}
                      </span>
                    </div>
                    <div className="mono muted-text">{record.value}</div>
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
