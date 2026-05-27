import { AppShell } from "@/components/AppShell";
import { apiGet } from "@/lib/api";
import { RefreshCw } from "lucide-react";

const fallbackRecords = [
  { type: "MX", name: "company.com", value: "mail.yourmailplatform.com" },
  { type: "TXT", name: "company.com", value: "v=spf1 mx include:yourmailplatform.com ~all" },
  { type: "TXT", name: "default._domainkey.company.com", value: "v=DKIM1; k=rsa; p=PUBLIC_KEY" },
  { type: "TXT", name: "_dmarc.company.com", value: "v=DMARC1; p=quarantine; rua=mailto:dmarc@yourmailplatform.com" },
];

export default async function DomainsPage() {
  const records = await apiGet("/domains/company.com/dns-records", fallbackRecords);

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

      <section className="panel">
        <h2>company.com</h2>
        <div className="records">
          {records.map((record) => (
            <div className="record" key={`${record.type}-${record.name}`}>
              <strong>{record.type}</strong>
              <div>
                <div className="mono">{record.name}</div>
                <div className="mono">{record.value}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
