import { Body, Controller, Delete, Get, Param, Post, Req } from "@nestjs/common";
import { AuthenticatedRequest } from "../../common/auth.middleware";
import { AuditService } from "../audit/audit.service";
import { MailcowService } from "../mailcow/mailcow.service";
import { TenancyService } from "../tenancy/tenancy.service";
import { CreateAliasDto } from "./dto/create-alias.dto";

@Controller("api/aliases")
export class AliasesController {
  constructor(
    private readonly mailcow: MailcowService,
    private readonly auditService: AuditService,
    private readonly tenancy: TenancyService,
  ) {}

  @Get()
  async listAliases(@Req() req: AuthenticatedRequest) {
    const aliases = await this.mailcow.listAliases();
    const ownedDomains = await this.tenancy.listDomainNames(req.user?.workspaceId);
    return ownedDomains
      ? aliases.filter((alias) => ownedDomains.includes(alias.address.split("@")[1] ?? ""))
      : aliases;
  }

  @Post()
  async createAlias(@Req() req: AuthenticatedRequest, @Body() body: CreateAliasDto) {
    await this.tenancy.ensureEmailAccess(req.user?.workspaceId, body.address);
    const result = await this.mailcow.addAlias(body);
    await this.tenancy.recordAlias(req.user?.workspaceId, body);
    await this.auditService.record("alias.create", body.address, req.user?.sub, req.user?.workspaceId);
    return result;
  }

  @Delete(":id")
  async deleteAlias(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    const result = await this.mailcow.deleteAlias(id);
    await this.tenancy.removeAlias(req.user?.workspaceId, id);
    await this.auditService.record("alias.delete", id, req.user?.sub, req.user?.workspaceId);
    return result;
  }
}
