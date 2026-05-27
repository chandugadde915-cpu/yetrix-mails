import { Controller, Get, Param } from "@nestjs/common";
import { DnsService } from "./dns.service";

@Controller("dns")
export class DnsController {
  constructor(private readonly dnsService: DnsService) {}

  @Get(":domain/check")
  checkDomain(@Param("domain") domain: string) {
    return this.dnsService.checkDomain(domain);
  }
}
