import { Body, Controller, Delete, Get, Param, Post, Put, Req } from "@nestjs/common";
import { AuthenticatedRequest } from "../../common/auth.middleware";
import { adminRoles, isSuperAdmin, operatorRoles, requireRole } from "../../common/rbac";
import { AuditService } from "../audit/audit.service";
import { MailcowService } from "../mailcow/mailcow.service";
import { TenancyService } from "../tenancy/tenancy.service";
import { CreateMailboxDto } from "./dto/create-mailbox.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { UpdateMailboxDto } from "./dto/update-mailbox.dto";

@Controller("api/mailboxes")
export class MailboxesController {
  constructor(
    private readonly mailcow: MailcowService,
    private readonly auditService: AuditService,
    private readonly tenancy: TenancyService,
  ) {}

  @Get()
  async listMailboxes(@Req() req: AuthenticatedRequest) {
    const mailboxes = await this.mailcow.listMailboxes();
    const ownedDomains = isSuperAdmin(req)
      ? null
      : await this.tenancy.listDomainNames(req.user?.workspaceId);
    return ownedDomains
      ? mailboxes.filter((mailbox) => ownedDomains.includes(mailbox.domain))
      : mailboxes;
  }

  @Post()
  async createMailbox(@Req() req: AuthenticatedRequest, @Body() body: CreateMailboxDto) {
    requireRole(req, operatorRoles);
    if (!isSuperAdmin(req)) {
      await this.tenancy.ensureEmailAccess(req.user?.workspaceId, body.email);
    }
    await this.tenancy.ensureEmailDomainVerified(req.user?.workspaceId, body.email, isSuperAdmin(req));
    const result = await this.mailcow.addMailbox(body);
    if (req.user?.workspaceId) {
      await this.tenancy.recordMailbox(req.user.workspaceId, body);
    }
    await this.auditService.record("mailbox.create", body.email, req.user?.sub, req.user?.workspaceId);
    return result;
  }

  @Put(":email")
  async updateMailbox(@Req() req: AuthenticatedRequest, @Param("email") email: string, @Body() body: UpdateMailboxDto) {
    requireRole(req, operatorRoles);
    if (!isSuperAdmin(req)) {
      await this.tenancy.ensureEmailAccess(req.user?.workspaceId, email);
    }
    const result = await this.mailcow.editMailbox(email, body);
    if (!isSuperAdmin(req) && req.user?.workspaceId) {
      await this.tenancy.updateMailbox(req.user.workspaceId, email, body);
    }
    await this.auditService.record("mailbox.update", email, req.user?.sub, req.user?.workspaceId);
    return result;
  }

  @Delete(":email")
  async deleteMailbox(@Req() req: AuthenticatedRequest, @Param("email") email: string) {
    requireRole(req, adminRoles);
    if (!isSuperAdmin(req)) {
      await this.tenancy.ensureEmailAccess(req.user?.workspaceId, email);
    }
    const result = await this.mailcow.deleteMailbox(email);
    if (isSuperAdmin(req)) {
      await this.tenancy.removeMailboxGlobally(email);
    } else {
      await this.tenancy.removeMailbox(req.user?.workspaceId, email);
    }
    await this.auditService.record("mailbox.delete", email, req.user?.sub, req.user?.workspaceId);
    return result;
  }

  @Post(":email/password")
  async resetPassword(@Req() req: AuthenticatedRequest, @Param("email") email: string, @Body() body: ResetPasswordDto) {
    requireRole(req, operatorRoles);
    if (!isSuperAdmin(req)) {
      await this.tenancy.ensureEmailAccess(req.user?.workspaceId, email);
    }
    const result = await this.mailcow.resetMailboxPassword(email, body.password);
    await this.auditService.record("mailbox.password", email, req.user?.sub, req.user?.workspaceId);
    return result;
  }

  @Post(":email/disable")
  async disableMailbox(@Req() req: AuthenticatedRequest, @Param("email") email: string) {
    requireRole(req, operatorRoles);
    if (!isSuperAdmin(req)) {
      await this.tenancy.ensureEmailAccess(req.user?.workspaceId, email);
    }
    const result = await this.mailcow.setMailboxActive(email, false);
    if (!isSuperAdmin(req) && req.user?.workspaceId) {
      await this.tenancy.updateMailbox(req.user.workspaceId, email, { active: false });
    }
    await this.auditService.record("mailbox.disable", email, req.user?.sub, req.user?.workspaceId);
    return result;
  }

  @Post(":email/enable")
  async enableMailbox(@Req() req: AuthenticatedRequest, @Param("email") email: string) {
    requireRole(req, operatorRoles);
    if (!isSuperAdmin(req)) {
      await this.tenancy.ensureEmailAccess(req.user?.workspaceId, email);
    }
    const result = await this.mailcow.setMailboxActive(email, true);
    if (!isSuperAdmin(req) && req.user?.workspaceId) {
      await this.tenancy.updateMailbox(req.user.workspaceId, email, { active: true });
    }
    await this.auditService.record("mailbox.enable", email, req.user?.sub, req.user?.workspaceId);
    return result;
  }
}
