import { Body, Controller, Post } from "@nestjs/common";
import { ListMessagesDto } from "./dto/list-messages.dto";
import { MailSessionDto } from "./dto/mail-session.dto";
import { MessageActionDto } from "./dto/message-action.dto";
import { SendMessageDto } from "./dto/send-message.dto";
import { MailWorkspaceService } from "./mail-workspace.service";

@Controller("public/mail")
export class MailPublicController {
  constructor(private readonly mailWorkspace: MailWorkspaceService) {}

  @Post("connection-test")
  testConnection(@Body() body: MailSessionDto) {
    return this.mailWorkspace.testConnection(body);
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

  @Post("contacts")
  listContacts(@Body() body: MailSessionDto) {
    return this.mailWorkspace.listContacts(body);
  }

  @Post("send")
  sendMessage(@Body() body: SendMessageDto) {
    return this.mailWorkspace.sendMessage(body);
  }
}
