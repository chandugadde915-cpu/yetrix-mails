import { Body, Controller, Delete, Get, Param, Post, Req } from "@nestjs/common";
import { AuthenticatedRequest } from "../../common/auth.middleware";
import { adminRoles, isSuperAdmin, requireRole } from "../../common/rbac";
import { AuditService } from "../audit/audit.service";
import { DnsService } from "../dns/dns.service";
import { MailcowService } from "../mailcow/mailcow.service";
import { TenancyService } from "../tenancy/tenancy.service";
import { CreateDomainDto } from "./dto/create-domain.dto";

@Controller("api/domains")
export class DomainsController {
  constructor(
    private readonly mailcow: MailcowService,
    private readonly dnsService: DnsService,
    private readonly auditService: AuditService,
    private readonly tenancy: TenancyService,
  ) {}

  @Get()
  async listDomains(@Req() req: AuthenticatedRequest) {
    const domains = await this.mailcow.listDomains();
    const ownedDomains = isSuperAdmin(req)
      ? null
      : await this.tenancy.listDomainNames(req.user?.workspaceId);
    const visibleDomains = ownedDomains
      ? domains.filter((domain) => ownedDomains.includes(domain.domain))
      : domains;

    return Promise.all(
      visibleDomains.map(async (domain) => ({
        ...domain,
        records: (await this.dnsService.verifyDomain(domain.domain)).records,
      })),
    );
  }

  @Post()
  async createDomain(@Req() req: AuthenticatedRequest, @Body() body: CreateDomainDto) {
    requireRole(req, adminRoles);
    if (!isSuperAdmin(req)) {
      await this.tenancy.ensureDomainAvailable(req.user?.workspaceId, body.domain);
    }
    const result = await this.mailcow.addDomain(body);
    if (req.user?.workspaceId) {
      await this.tenancy.recordDomain(req.user.workspaceId, body.domain);
    }
    await this.auditService.record("domain.create", body.domain, req.user?.sub, req.user?.workspaceId);
    return result;
  }

  @Get(":domain/dns-records")
  getDnsRecords(@Param("domain") domain: string) {
    return this.mailcow.dnsPlaceholders(domain);
  }

  @Delete(":domain")
  async deleteDomain(@Req() req: AuthenticatedRequest, @Param("domain") domain: string) {
    requireRole(req, adminRoles);
    if (!isSuperAdmin(req)) {
      await this.tenancy.ensureDomainAccess(req.user?.workspaceId, domain);
    }
    const result = await this.mailcow.deleteDomain(domain);
    if (isSuperAdmin(req)) {
      await this.tenancy.removeDomainGlobally(domain);
    } else {
      await this.tenancy.removeDomain(req.user?.workspaceId, domain);
    }
    await this.auditService.record("domain.delete", domain, req.user?.sub, req.user?.workspaceId);
    return result;
  }

  @Get(":domain/dns-status")
  getDnsStatus(@Param("domain") domain: string) {
    return this.dnsService.verifyDomain(domain);
  }
}
