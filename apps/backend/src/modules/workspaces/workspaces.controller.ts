import { Body, Controller, Delete, Get, Param, Put, Post, Req } from "@nestjs/common";
import { AuthenticatedRequest } from "../../common/auth.middleware";
import { AuditService } from "../audit/audit.service";
import { MailcowService } from "../mailcow/mailcow.service";
import { TenancyService } from "../tenancy/tenancy.service";
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
    return this.workspaces.getWorkspace(req.user?.workspaceId);
  }

  @Put("workspace")
  updateWorkspace(@Req() req: AuthenticatedRequest, @Body() body: UpdateWorkspaceDto) {
    return this.workspaces.updateWorkspace(req.user?.workspaceId, body.name);
  }

  @Post("workspace/sync")
  async syncWorkspace(@Req() req: AuthenticatedRequest) {
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
    return this.workspaces.listUsers(req.user?.workspaceId);
  }

  @Post("users")
  createUser(@Req() req: AuthenticatedRequest, @Body() body: CreateUserDto) {
    return this.workspaces.createUser(req.user?.workspaceId, body);
  }

  @Put("users/:id")
  updateUser(@Req() req: AuthenticatedRequest, @Param("id") id: string, @Body() body: UpdateUserDto) {
    return this.workspaces.updateUser(req.user?.workspaceId, id, body);
  }

  @Delete("users/:id")
  deleteUser(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.workspaces.deleteUser(req.user?.workspaceId, id);
  }
}
