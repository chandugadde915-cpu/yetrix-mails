import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { promises as dns } from "dns";

@Injectable()
export class DnsService {
  private readonly mailServerIp: string;
  private readonly dkimSelector: string;

  constructor(config: ConfigService) {
    this.mailServerIp = config.get<string>("MAIL_SERVER_IP", "56.228.11.175");
    this.dkimSelector = config.get<string>("MAILCOW_DKIM_SELECTOR", "dkim");
  }

  async verifyDomain(domain: string) {
    const mailHost = `mail.${domain}`;
    const [mx, txt, dmarc, dkim, a] = await Promise.allSettled([
      dns.resolveMx(domain),
      dns.resolveTxt(domain),
      dns.resolveTxt(`_dmarc.${domain}`),
      dns.resolveTxt(`${this.dkimSelector}._domainkey.${domain}`),
      dns.resolve4(mailHost),
    ]);

    const txtRecords = txt.status === "fulfilled" ? txt.value.map((record) => record.join("")) : [];
    const dmarcRecords =
      dmarc.status === "fulfilled" ? dmarc.value.map((record) => record.join("")) : [];
    const dkimRecords =
      dkim.status === "fulfilled" ? dkim.value.map((record) => record.join("")) : [];
    const aRecords = a.status === "fulfilled" ? a.value : [];
    const checks = {
      mx:
        mx.status === "fulfilled" &&
        mx.value.some((record) => record.exchange.replace(/\.$/, "") === mailHost),
      a: aRecords.includes(this.mailServerIp),
      spf: txtRecords.some(
        (record) => record.startsWith("v=spf1") && record.includes(this.mailServerIp),
      ),
      dkim: dkimRecords.some((record) => record.startsWith("v=DKIM1")),
      dmarc: dmarcRecords.some((record) => record.startsWith("v=DMARC1")),
    };

    return {
      domain,
      verified: Object.values(checks).every(Boolean),
      checks,
      records: [
        {
          type: "MX",
          name: domain,
          value: `10 ${mailHost}`,
          status: checks.mx ? "verified" : "missing",
        },
        {
          type: "A",
          name: mailHost,
          value: this.mailServerIp,
          status: checks.a ? "verified" : "missing",
        },
        {
          type: "SPF",
          name: domain,
          value: `v=spf1 mx ip4:${this.mailServerIp} ~all`,
          status: checks.spf ? "verified" : "missing",
        },
        {
          type: "DKIM",
          name: `${this.dkimSelector}._domainkey.${domain}`,
          value: dkimRecords.find((record) => record.startsWith("v=DKIM1")) ?? "Generate DKIM from Operations",
          status: checks.dkim ? "verified" : "missing",
        },
        {
          type: "DMARC",
          name: `_dmarc.${domain}`,
          value: `v=DMARC1; p=quarantine; rua=mailto:dmarc@${domain}`,
          status: checks.dmarc ? "verified" : "missing",
        },
      ],
      raw: {
        mx: mx.status === "fulfilled" ? mx.value : [],
        a: aRecords,
        txt: txtRecords,
        dmarc: dmarcRecords,
        dkim: dkimRecords,
      },
    };
  }
}
