import { Body, Controller, Delete, ForbiddenException, Get, Param, Post, Put, Req } from "@nestjs/common";
import { AuthenticatedRequest } from "../../common/auth.middleware";
import { AuditService } from "../audit/audit.service";
import { MailcowService } from "../mailcow/mailcow.service";
import { TenancyService } from "../tenancy/tenancy.service";
import { CreateAliasDto } from "./dto/create-alias.dto";
import { UpdateAliasDto } from "./dto/update-alias.dto";

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

  @Put(":id")
  async updateAlias(@Req() req: AuthenticatedRequest, @Param("id") id: string, @Body() body: UpdateAliasDto) {
    if (body.address) {
      await this.tenancy.ensureEmailAccess(req.user?.workspaceId, body.address);
    }

    if (id.includes("@")) {
      await this.tenancy.ensureEmailAccess(req.user?.workspaceId, id);
    } else {
      const aliases = await this.mailcow.listAliases();
      const current = aliases.find((alias) => alias.id === id || alias.address.toLowerCase() === id.toLowerCase());
      if (current) {
        await this.tenancy.ensureEmailAccess(req.user?.workspaceId, current.address);
      } else {
        throw new ForbiddenException("Alias does not belong to the current workspace");
      }
    }

    const result = await this.mailcow.editAlias(id, body);
    await this.tenancy.updateAlias(req.user?.workspaceId, id, body);
    await this.auditService.record("alias.update", id, req.user?.sub, req.user?.workspaceId);
    return result;
  }

  @Delete(":id")
  async deleteAlias(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    if (id.includes("@")) {
      await this.tenancy.ensureEmailAccess(req.user?.workspaceId, id);
    } else {
      const aliases = await this.mailcow.listAliases();
      const current = aliases.find((alias) => alias.id === id || alias.address.toLowerCase() === id.toLowerCase());
      if (current) {
        await this.tenancy.ensureEmailAccess(req.user?.workspaceId, current.address);
      } else {
        throw new ForbiddenException("Alias does not belong to the current workspace");
      }
    }

    const result = await this.mailcow.deleteAlias(id);
    await this.tenancy.removeAlias(req.user?.workspaceId, id);
    await this.auditService.record("alias.delete", id, req.user?.sub, req.user?.workspaceId);
    return result;
  }
}
