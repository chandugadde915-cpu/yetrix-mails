import { Body, Controller, Get, Header, Param, Post, Query, Req, Res } from "@nestjs/common";
import { Response } from "express";
import { AuthenticatedRequest } from "../../common/auth.middleware";
import { isSuperAdmin } from "../../common/rbac";
import { TenancyService } from "../tenancy/tenancy.service";
import { ListMessagesDto } from "./dto/list-messages.dto";
import { MailQueryDto } from "./dto/mail-query.dto";
import { MailSessionDto } from "./dto/mail-session.dto";
import { MessageActionDto } from "./dto/message-action.dto";
import { DraftMessageDto, SendMessageDto } from "./dto/send-message.dto";
import { SyncMailDto } from "./dto/sync-mail.dto";
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
    return this.mailWorkspace.listMessages(body, isSuperAdmin(req) ? undefined : req.user?.workspaceId);
  }

  @Get("inbox")
  async listInbox(@Req() req: AuthenticatedRequest, @Query() query: MailQueryDto) {
    await this.ensureReadableMailbox(req, query.mailbox);
    return this.mailWorkspace.listStoredFolder({ ...query, folder: "INBOX" }, this.workspaceScope(req));
  }

  @Get("sent")
  async listSent(@Req() req: AuthenticatedRequest, @Query() query: MailQueryDto) {
    await this.ensureReadableMailbox(req, query.mailbox);
    return this.mailWorkspace.listStoredFolder({ ...query, folder: "Sent" }, this.workspaceScope(req));
  }

  @Get("drafts")
  async listDrafts(@Req() req: AuthenticatedRequest, @Query() query: MailQueryDto) {
    await this.ensureReadableMailbox(req, query.mailbox);
    return this.mailWorkspace.listStoredFolder({ ...query, folder: "Drafts" }, this.workspaceScope(req));
  }

  @Get("trash")
  async listTrash(@Req() req: AuthenticatedRequest, @Query() query: MailQueryDto) {
    await this.ensureReadableMailbox(req, query.mailbox);
    return this.mailWorkspace.listStoredFolder({ ...query, folder: "Trash" }, this.workspaceScope(req));
  }

  @Get("spam")
  async listSpam(@Req() req: AuthenticatedRequest, @Query() query: MailQueryDto) {
    await this.ensureReadableMailbox(req, query.mailbox);
    return this.mailWorkspace.listStoredFolder({ ...query, folder: "Junk" }, this.workspaceScope(req));
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
    return this.mailWorkspace.listFolders(body, isSuperAdmin(req) ? undefined : req.user?.workspaceId);
  }

  @Post("message")
  async getMessage(@Req() req: AuthenticatedRequest, @Body() body: MessageActionDto) {
    if (!isSuperAdmin(req)) {
      await this.tenancy.ensureEmailAccess(req.user?.workspaceId, body.email);
    }
    return this.mailWorkspace.getMessage(body, isSuperAdmin(req) ? undefined : req.user?.workspaceId);
  }

  @Post("message/delete")
  async deleteMessage(@Req() req: AuthenticatedRequest, @Body() body: MessageActionDto) {
    if (!isSuperAdmin(req)) {
      await this.tenancy.ensureEmailAccess(req.user?.workspaceId, body.email);
    }
    return this.mailWorkspace.deleteMessage(body, isSuperAdmin(req) ? undefined : req.user?.workspaceId);
  }

  @Post("message/archive")
  async archiveMessage(@Req() req: AuthenticatedRequest, @Body() body: MessageActionDto) {
    if (!isSuperAdmin(req)) {
      await this.tenancy.ensureEmailAccess(req.user?.workspaceId, body.email);
    }
    return this.mailWorkspace.archiveMessage(body, isSuperAdmin(req) ? undefined : req.user?.workspaceId);
  }

  @Post("message/trash")
  async trashMessage(@Req() req: AuthenticatedRequest, @Body() body: MessageActionDto) {
    if (!isSuperAdmin(req)) {
      await this.tenancy.ensureEmailAccess(req.user?.workspaceId, body.email);
    }
    return this.mailWorkspace.trashMessage(body, isSuperAdmin(req) ? undefined : req.user?.workspaceId);
  }

  @Post("message/flag")
  async flagMessage(@Req() req: AuthenticatedRequest, @Body() body: MessageActionDto) {
    if (!isSuperAdmin(req)) {
      await this.tenancy.ensureEmailAccess(req.user?.workspaceId, body.email);
    }
    return this.mailWorkspace.setFlagged(body, true, isSuperAdmin(req) ? undefined : req.user?.workspaceId);
  }

  @Post("message/unflag")
  async unflagMessage(@Req() req: AuthenticatedRequest, @Body() body: MessageActionDto) {
    if (!isSuperAdmin(req)) {
      await this.tenancy.ensureEmailAccess(req.user?.workspaceId, body.email);
    }
    return this.mailWorkspace.setFlagged(body, false, isSuperAdmin(req) ? undefined : req.user?.workspaceId);
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
    return this.mailWorkspace.sendMessage(body, this.workspaceScope(req));
  }

  @Post("draft")
  async saveDraft(@Req() req: AuthenticatedRequest, @Body() body: DraftMessageDto) {
    if (!isSuperAdmin(req)) {
      await this.tenancy.ensureEmailAccess(req.user?.workspaceId, body.from);
    }
    return this.mailWorkspace.saveDraft(body, this.workspaceScope(req));
  }

  @Post("sync")
  async syncMailbox(@Req() req: AuthenticatedRequest, @Body() body: SyncMailDto) {
    if (!isSuperAdmin(req)) {
      await this.tenancy.ensureEmailAccess(req.user?.workspaceId, body.email);
    }
    return this.mailWorkspace.syncMailbox(body, this.workspaceScope(req));
  }

  @Get("attachments/:id/download")
  @Header("Cache-Control", "private, no-store")
  async downloadAttachment(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Query("mailbox") mailbox: string | undefined,
    @Res() response: Response,
  ) {
    if (mailbox && !isSuperAdmin(req)) {
      await this.tenancy.ensureEmailAccess(req.user?.workspaceId, mailbox);
    }
    const attachment = await this.mailWorkspace.getStoredAttachment(
      { id, mailbox },
      this.workspaceScope(req),
    );
    response.setHeader("Content-Type", attachment.contentType);
    response.setHeader("Content-Disposition", `attachment; filename="${attachment.filename.replace(/"/g, "")}"`);
    return response.send(attachment.bytes);
  }

  @Get(":id")
  async getStoredMessage(@Req() req: AuthenticatedRequest, @Param("id") id: string, @Query("mailbox") mailbox: string) {
    await this.ensureReadableMailbox(req, mailbox);
    return this.mailWorkspace.getStoredMessage({ mailbox, id }, this.workspaceScope(req));
  }

  private workspaceScope(req: AuthenticatedRequest) {
    return isSuperAdmin(req) ? undefined : req.user?.workspaceId;
  }

  private async ensureReadableMailbox(req: AuthenticatedRequest, mailbox: string) {
    if (!isSuperAdmin(req)) {
      await this.tenancy.ensureEmailAccess(req.user?.workspaceId, mailbox);
    }
  }
}
