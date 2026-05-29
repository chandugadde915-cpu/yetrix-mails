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
      visibleDomains.map(async (domain) => {
        const verification = await this.dnsService.verifyDomain(domain.domain);
        await this.tenancy.recordDnsCheck(
          req.user?.workspaceId,
          domain.domain,
          verification,
          isSuperAdmin(req),
        );
        return {
          ...domain,
          status: verification.verified ? "verified" : "pending_dns",
          records: verification.records,
        };
      }),
    );
  }

  @Post()
  async createDomain(@Req() req: AuthenticatedRequest, @Body() body: CreateDomainDto) {
    requireRole(req, adminRoles);
    const domain = body.domain.trim().toLowerCase();

    if (!isSuperAdmin(req)) {
      const existingDomain = await this.tenancy.findDomain(domain);
      if (existingDomain?.workspace_id === req.user?.workspaceId) {
        return {
          domain,
          existing: true,
          message: "Domain already exists in this workspace",
        };
      }
      await this.tenancy.ensureDomainAvailable(req.user?.workspaceId, domain);
    }

    const existingMailcowDomain = await this.mailcow.findDomain(domain);
    if (existingMailcowDomain) {
      if (req.user?.workspaceId) {
        await this.tenancy.recordDomain(req.user.workspaceId, domain);
      }
      await this.auditService.record("domain.link_existing", domain, req.user?.sub, req.user?.workspaceId);
      return {
        domain,
        existing: true,
        message: "Domain already exists in the mail engine and is linked to this workspace",
        result: existingMailcowDomain,
      };
    }

    const result = await this.mailcow.addDomain({ ...body, domain });
    if (req.user?.workspaceId) {
      await this.tenancy.recordDomain(req.user.workspaceId, domain);
    }
    await this.auditService.record("domain.create", domain, req.user?.sub, req.user?.workspaceId);
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
  async getDnsStatus(@Req() req: AuthenticatedRequest, @Param("domain") domain: string) {
    return this.checkDns(req, domain);
  }

  @Post(":domain/check-dns")
  async checkDns(@Req() req: AuthenticatedRequest, @Param("domain") domain: string) {
    if (!isSuperAdmin(req)) {
      await this.tenancy.ensureDomainAccess(req.user?.workspaceId, domain);
    }
    const verification = await this.dnsService.verifyDomain(domain);
    await this.tenancy.recordDnsCheck(req.user?.workspaceId, domain, verification, isSuperAdmin(req));
    return verification;
  }
}
