import { Body, Controller, Get, Post, Req, Res } from "@nestjs/common";
import { Response } from "express";
import { AuthenticatedRequest } from "../../common/auth.middleware";
import { isSuperAdmin } from "../../common/rbac";
import { TenancyService } from "../tenancy/tenancy.service";
import { ListMessagesDto } from "./dto/list-messages.dto";
import { MailSessionDto } from "./dto/mail-session.dto";
import { MessageActionDto } from "./dto/message-action.dto";
import { SendMessageDto } from "./dto/send-message.dto";
import { MailWorkspaceService } from "./mail-workspace.service";

@Controller("api/mail")
export class MailWorkspaceController {
  constructor(
    private readonly mailWorkspace: MailWorkspaceService,
    private readonly tenancy: TenancyService,
  ) {}

  @Post("messages")
  async listMessages(@Req() req: AuthenticatedRequest, @Body() body: ListMessagesDto) {
    if (!isSuperAdmin(req)) {
      await this.tenancy.ensureEmailAccess(req.user?.workspaceId, body.email);
    }
    return this.mailWorkspace.listMessages(body);
  }

  @Post("connection-test")
  async testConnection(@Req() req: AuthenticatedRequest, @Body() body: MailSessionDto) {
    if (!isSuperAdmin(req)) {
      await this.tenancy.ensureEmailAccess(req.user?.workspaceId, body.email);
    }
    return this.mailWorkspace.testConnection(body);
  }

  @Get("smtp-health")
  async smtpHealth(@Res() response: Response) {
    const health = await this.mailWorkspace.smtpHealth();
    return response.status(health.success ? 200 : 503).json(health);
  }

  @Post("folders")
  async listFolders(@Req() req: AuthenticatedRequest, @Body() body: MailSessionDto) {
    if (!isSuperAdmin(req)) {
      await this.tenancy.ensureEmailAccess(req.user?.workspaceId, body.email);
    }
    return this.mailWorkspace.listFolders(body);
  }

  @Post("message")
  async getMessage(@Req() req: AuthenticatedRequest, @Body() body: MessageActionDto) {
    if (!isSuperAdmin(req)) {
      await this.tenancy.ensureEmailAccess(req.user?.workspaceId, body.email);
    }
    return this.mailWorkspace.getMessage(body);
  }

  @Post("message/delete")
  async deleteMessage(@Req() req: AuthenticatedRequest, @Body() body: MessageActionDto) {
    if (!isSuperAdmin(req)) {
      await this.tenancy.ensureEmailAccess(req.user?.workspaceId, body.email);
    }
    return this.mailWorkspace.deleteMessage(body);
  }

  @Post("message/archive")
  async archiveMessage(@Req() req: AuthenticatedRequest, @Body() body: MessageActionDto) {
    if (!isSuperAdmin(req)) {
      await this.tenancy.ensureEmailAccess(req.user?.workspaceId, body.email);
    }
    return this.mailWorkspace.archiveMessage(body);
  }

  @Post("message/trash")
  async trashMessage(@Req() req: AuthenticatedRequest, @Body() body: MessageActionDto) {
    if (!isSuperAdmin(req)) {
      await this.tenancy.ensureEmailAccess(req.user?.workspaceId, body.email);
    }
    return this.mailWorkspace.trashMessage(body);
  }

  @Post("message/flag")
  async flagMessage(@Req() req: AuthenticatedRequest, @Body() body: MessageActionDto) {
    if (!isSuperAdmin(req)) {
      await this.tenancy.ensureEmailAccess(req.user?.workspaceId, body.email);
    }
    return this.mailWorkspace.setFlagged(body, true);
  }

  @Post("message/unflag")
  async unflagMessage(@Req() req: AuthenticatedRequest, @Body() body: MessageActionDto) {
    if (!isSuperAdmin(req)) {
      await this.tenancy.ensureEmailAccess(req.user?.workspaceId, body.email);
    }
    return this.mailWorkspace.setFlagged(body, false);
  }

  @Post("contacts")
  async listContacts(@Req() req: AuthenticatedRequest, @Body() body: MailSessionDto) {
    if (!isSuperAdmin(req)) {
      await this.tenancy.ensureEmailAccess(req.user?.workspaceId, body.email);
    }
    return this.mailWorkspace.listContacts(body);
  }

  @Post("send")
  async sendMessage(@Req() req: AuthenticatedRequest, @Body() body: SendMessageDto) {
    if (!isSuperAdmin(req)) {
      await this.tenancy.ensureEmailAccess(req.user?.workspaceId, body.from);
    }
    return this.mailWorkspace.sendMessage(body, req.user?.workspaceId);
  }
}
