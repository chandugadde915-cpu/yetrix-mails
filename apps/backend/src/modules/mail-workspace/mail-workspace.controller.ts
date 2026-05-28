import { Body, Controller, Post, Req } from "@nestjs/common";
import { AuthenticatedRequest } from "../../common/auth.middleware";
import { TenancyService } from "../tenancy/tenancy.service";
import { ListMessagesDto } from "./dto/list-messages.dto";
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
    await this.tenancy.ensureEmailAccess(req.user?.workspaceId, body.email);
    return this.mailWorkspace.listMessages(body);
  }

  @Post("send")
  async sendMessage(@Req() req: AuthenticatedRequest, @Body() body: SendMessageDto) {
    await this.tenancy.ensureEmailAccess(req.user?.workspaceId, body.from);
    return this.mailWorkspace.sendMessage(body);
  }
}
