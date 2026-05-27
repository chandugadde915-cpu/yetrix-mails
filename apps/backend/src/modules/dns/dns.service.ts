import { Injectable } from "@nestjs/common";
import { promises as dns } from "dns";

@Injectable()
export class DnsService {
  async checkDomain(domain: string) {
    const [mx, txt] = await Promise.allSettled([
      dns.resolveMx(domain),
      dns.resolveTxt(domain),
    ]);

    return {
      domain,
      checks: {
        mx: mx.status === "fulfilled" && mx.value.length > 0,
        spf:
          txt.status === "fulfilled" &&
          txt.value.some((record) => record.join("").startsWith("v=spf1")),
        dmarc: false,
        dkim: false,
      },
      raw: {
        mx: mx.status === "fulfilled" ? mx.value : [],
        txt: txt.status === "fulfilled" ? txt.value : [],
      },
    };
  }
}
