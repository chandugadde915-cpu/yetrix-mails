import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { MailcowService } from "../mailcow/mailcow.service";
import { CreateDomainDto } from "./dto/create-domain.dto";

@Controller("api/domains")
export class DomainsController {
  constructor(private readonly mailcow: MailcowService) {}

  @Get()
  listDomains() {
    return this.mailcow.listDomains();
  }

  @Post()
  createDomain(@Body() body: CreateDomainDto) {
    return this.mailcow.addDomain(body);
  }

  @Get(":domain/dns-records")
  getDnsRecords(@Param("domain") domain: string) {
    return this.mailcow.dnsPlaceholders(domain);
  }

  @Delete(":domain")
  deleteDomain(@Param("domain") domain: string) {
    return this.mailcow.deleteDomain(domain);
  }
}
