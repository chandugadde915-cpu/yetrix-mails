import { BadRequestException, Body, Controller, Delete, Get, Param, Put, Post, Req } from "@nestjs/common";
import { AuthenticatedRequest } from "../../common/auth.middleware";
import { adminRoles, isSuperAdmin, requireRole } from "../../common/rbac";
import { AuditService } from "../audit/audit.service";
import { MailcowService } from "../mailcow/mailcow.service";
import { TenancyService } from "../tenancy/tenancy.service";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UpdateWorkspaceDto } from "./dto/update-workspace.dto";
import { WorkspacesService } from "./workspaces.service";

@Controller("api")
export class WorkspacesController {
  constructor(
    private readonly workspaces: WorkspacesService,
    private readonly mailcow: MailcowService,
    private readonly tenancy: TenancyService,
    private readonly audit: AuditService,
  ) {}

  @Get("workspace")
  getWorkspace(@Req() req: AuthenticatedRequest) {
    return this.workspaces.getWorkspace(req.user?.workspaceId, isSuperAdmin(req));
  }

  @Put("workspace")
  updateWorkspace(@Req() req: AuthenticatedRequest, @Body() body: UpdateWorkspaceDto) {
    requireRole(req, adminRoles);
    return this.workspaces.updateWorkspace(req.user?.workspaceId, body.name);
  }

  @Post("workspace/sync")
  async syncWorkspace(@Req() req: AuthenticatedRequest) {
    requireRole(req, adminRoles);
    const ownedDomains = await this.tenancy.listDomainNames(req.user?.workspaceId);
    const owned = new Set((ownedDomains ?? []).map((domain) => domain.toLowerCase()));
    const [domains, mailboxes, aliases] = await Promise.all([
      this.mailcow.listDomains(),
      this.mailcow.listMailboxes(),
      this.mailcow.listAliases(),
    ]);

    const syncedDomains = domains.filter((domain) => owned.has(domain.domain.toLowerCase()));
    const syncedMailboxes = mailboxes.filter((mailbox) => owned.has(mailbox.domain.toLowerCase()));
    const syncedAliases = aliases.filter((alias) => owned.has(alias.address.split("@")[1]?.toLowerCase() ?? ""));

    for (const domain of syncedDomains) {
      await this.tenancy.recordDomain(req.user?.workspaceId, domain.domain);
    }

    for (const mailbox of syncedMailboxes) {
      await this.tenancy.recordMailbox(req.user?.workspaceId, {
        email: mailbox.address,
        name: mailbox.name,
        quotaMb: mailbox.quotaMb,
        active: mailbox.active,
      });
    }

    for (const alias of syncedAliases) {
      await this.tenancy.recordAlias(req.user?.workspaceId, {
        address: alias.address,
        goto: alias.goto,
        active: alias.active,
      });
    }

    await this.audit.record("workspace.sync", "mailcow", req.user?.sub, req.user?.workspaceId);

    return {
      domains: syncedDomains.length,
      mailboxes: syncedMailboxes.length,
      aliases: syncedAliases.length,
    };
  }

  @Get("users")
  listUsers(@Req() req: AuthenticatedRequest) {
    requireRole(req, adminRoles);
    return this.workspaces.listUsers(req.user?.workspaceId, isSuperAdmin(req));
  }

  @Post("users")
  createUser(@Req() req: AuthenticatedRequest, @Body() body: CreateUserDto) {
    requireRole(req, adminRoles);
    return this.workspaces.createUser(req.user?.workspaceId, body, isSuperAdmin(req));
  }

  @Put("users/:id")
  updateUser(@Req() req: AuthenticatedRequest, @Param("id") id: string, @Body() body: UpdateUserDto) {
    requireRole(req, adminRoles);
    return this.workspaces.updateUser(req.user?.workspaceId, id, body, isSuperAdmin(req));
  }

  @Delete("users/:id")
  deleteUser(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    requireRole(req, adminRoles);
    if (id === req.user?.userId) {
      throw new BadRequestException("You cannot delete your own active session user");
    }
    return this.workspaces.deleteUser(req.user?.workspaceId, id, isSuperAdmin(req));
  }

  @Post("me/password")
  changeOwnPassword(@Req() req: AuthenticatedRequest, @Body() body: ChangePasswordDto) {
    return this.workspaces.changeOwnPassword(req.user?.workspaceId, req.user?.userId, body);
  }
}
