import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { CreateDomainDto } from "./dto/create-domain.dto";
import { DomainsService } from "./domains.service";

@Controller("domains")
export class DomainsController {
  constructor(private readonly domainsService: DomainsService) {}

  @Get()
  listDomains() {
    return this.domainsService.listDomains();
  }

  @Post()
  createDomain(@Body() body: CreateDomainDto) {
    return this.domainsService.createDomain(body.domain);
  }

  @Get(":domain/dns-records")
  getDnsRecords(@Param("domain") domain: string) {
    return this.domainsService.requiredDnsRecords(domain);
  }
}
