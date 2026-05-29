import { Body, Controller, Get, Post, Res, UnauthorizedException } from "@nestjs/common";
import { Response } from "express";
import { ListMessagesDto } from "./dto/list-messages.dto";
import { MailSessionDto } from "./dto/mail-session.dto";
import { MessageActionDto } from "./dto/message-action.dto";
import { DraftMessageDto, SendMessageDto } from "./dto/send-message.dto";
import { SyncMailDto } from "./dto/sync-mail.dto";
import { MailWorkspaceService } from "./mail-workspace.service";

@Controller("public/mail")
export class MailPublicController {
  constructor(private readonly mailWorkspace: MailWorkspaceService) {}

  @Post("connection-test")
  testConnection(@Body() body: MailSessionDto) {
    return this.mailWorkspace.testConnection(body);
  }

  @Get("smtp-health")
  async smtpHealth(@Res() response: Response) {
    const health = await this.mailWorkspace.smtpHealth();
    return response.status(health.success ? 200 : 503).json(health);
  }

  @Post("folders")
  listFolders(@Body() body: MailSessionDto) {
    return this.mailWorkspace.listFolders(body);
  }

  @Post("messages")
  listMessages(@Body() body: ListMessagesDto) {
    return this.mailWorkspace.listMessages(body);
  }

  @Post("message")
  getMessage(@Body() body: MessageActionDto) {
    return this.mailWorkspace.getMessage(body);
  }

  @Post("message/delete")
  deleteMessage(@Body() body: MessageActionDto) {
    return this.mailWorkspace.deleteMessage(body);
  }

  @Post("message/archive")
  archiveMessage(@Body() body: MessageActionDto) {
    return this.mailWorkspace.archiveMessage(body);
  }

  @Post("message/trash")
  trashMessage(@Body() body: MessageActionDto) {
    return this.mailWorkspace.trashMessage(body);
  }

  @Post("message/flag")
  flagMessage(@Body() body: MessageActionDto) {
    return this.mailWorkspace.setFlagged(body, true);
  }

  @Post("message/unflag")
  unflagMessage(@Body() body: MessageActionDto) {
    return this.mailWorkspace.setFlagged(body, false);
  }

  @Post("contacts")
  listContacts(@Body() body: MailSessionDto) {
    return this.mailWorkspace.listContacts(body);
  }

  @Post("draft")
  async saveDraft(@Body() body: DraftMessageDto) {
    if (!body.password) {
      throw new UnauthorizedException("Mailbox email or password is incorrect");
    }
    await this.mailWorkspace.testConnection({ email: body.from, password: body.password });
    return this.mailWorkspace.saveDraft(body);
  }

  @Post("sync")
  syncMailbox(@Body() body: SyncMailDto) {
    return this.mailWorkspace.syncMailbox(body);
  }

  @Post("send")
  sendMessage(@Body() body: SendMessageDto) {
    return this.mailWorkspace.sendMessage(body);
  }
}
