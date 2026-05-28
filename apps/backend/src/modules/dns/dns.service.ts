import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { promises as dns } from "dns";

@Injectable()
export class DnsService {
  private readonly mailDomain: string;
  private readonly mailServerIp: string;
  private readonly dkimSelector: string;

  constructor(config: ConfigService) {
    this.mailDomain = config.get<string>("MAIL_DOMAIN", "yetrixtechnologies.com");
    this.mailServerIp = config.get<string>("MAIL_SERVER_IP", "56.228.11.175");
    this.dkimSelector = config.get<string>("MAILCOW_DKIM_SELECTOR", "dkim");
  }

  async verifyDomain(domain: string) {
    const [mx, txt, dmarc, dkim] = await Promise.allSettled([
      dns.resolveMx(domain),
      dns.resolveTxt(domain),
      dns.resolveTxt(`_dmarc.${domain}`),
      dns.resolveTxt(`${this.dkimSelector}._domainkey.${domain}`),
    ]);

    const txtRecords = txt.status === "fulfilled" ? txt.value.map((record) => record.join("")) : [];
    const dmarcRecords =
      dmarc.status === "fulfilled" ? dmarc.value.map((record) => record.join("")) : [];
    const dkimRecords =
      dkim.status === "fulfilled" ? dkim.value.map((record) => record.join("")) : [];
    const expectedMx = `mail.${this.mailDomain}`;

    return {
      domain,
      checks: {
        mx:
          mx.status === "fulfilled" &&
          mx.value.some((record) => record.exchange.replace(/\.$/, "") === expectedMx),
        spf: txtRecords.some(
          (record) => record.startsWith("v=spf1") && record.includes(this.mailServerIp),
        ),
        dmarc: dmarcRecords.some((record) => record.startsWith("v=DMARC1")),
        dkim: dkimRecords.some((record) => record.startsWith("v=DKIM1")),
      },
      records: [
        {
          type: "MX",
          name: domain,
          value: `10 ${expectedMx}`,
          status:
            mx.status === "fulfilled" &&
            mx.value.some((record) => record.exchange.replace(/\.$/, "") === expectedMx)
              ? "verified"
              : "missing",
        },
        {
          type: "SPF",
          name: domain,
          value: `v=spf1 mx ip4:${this.mailServerIp} ~all`,
          status: txtRecords.some(
            (record) => record.startsWith("v=spf1") && record.includes(this.mailServerIp),
          )
            ? "verified"
            : "missing",
        },
        {
          type: "DKIM",
          name: `${this.dkimSelector}._domainkey.${domain}`,
          value: "v=DKIM1; ...",
          status: dkimRecords.some((record) => record.startsWith("v=DKIM1"))
            ? "verified"
            : "missing",
        },
        {
          type: "DMARC",
          name: `_dmarc.${domain}`,
          value: `v=DMARC1; p=quarantine; rua=mailto:dmarc@${this.mailDomain}`,
          status: dmarcRecords.some((record) => record.startsWith("v=DMARC1"))
            ? "verified"
            : "missing",
        },
      ],
      raw: {
        mx: mx.status === "fulfilled" ? mx.value : [],
        txt: txtRecords,
        dmarc: dmarcRecords,
        dkim: dkimRecords,
      },
    };
  }
}
