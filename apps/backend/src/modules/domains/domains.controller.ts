import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { AuditService } from "../audit/audit.service";
import { DnsService } from "../dns/dns.service";
import { MailcowService } from "../mailcow/mailcow.service";
import { CreateDomainDto } from "./dto/create-domain.dto";

@Controller("api/domains")
export class DomainsController {
  constructor(
    private readonly mailcow: MailcowService,
    private readonly dnsService: DnsService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  async listDomains() {
    const domains = await this.mailcow.listDomains();
    return Promise.all(
      domains.map(async (domain) => ({
        ...domain,
        records: (await this.dnsService.verifyDomain(domain.domain)).records,
      })),
    );
  }

  @Post()
  async createDomain(@Body() body: CreateDomainDto) {
    const result = await this.mailcow.addDomain(body);
    this.auditService.record("domain.create", body.domain);
    return result;
  }

  @Get(":domain/dns-records")
  getDnsRecords(@Param("domain") domain: string) {
    return this.mailcow.dnsPlaceholders(domain);
  }

  @Delete(":domain")
  async deleteDomain(@Param("domain") domain: string) {
    const result = await this.mailcow.deleteDomain(domain);
    this.auditService.record("domain.delete", domain);
    return result;
  }

  @Get(":domain/dns-status")
  getDnsStatus(@Param("domain") domain: string) {
    return this.dnsService.verifyDomain(domain);
  }
}
