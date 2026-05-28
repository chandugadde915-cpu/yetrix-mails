import { Controller, Get, Param } from "@nestjs/common";
import { DnsService } from "./dns.service";

@Controller("api/dns")
export class DnsController {
  constructor(private readonly dnsService: DnsService) {}

  @Get(":domain/check")
  checkDomain(@Param("domain") domain: string) {
    return this.dnsService.verifyDomain(domain);
  }
}
