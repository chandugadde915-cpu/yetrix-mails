import { Controller, Get } from "@nestjs/common";
import { MailWorkspaceService } from "../mail-workspace/mail-workspace.service";
import { MailcowService } from "../mailcow/mailcow.service";

@Controller("api/status")
export class StatusController {
  constructor(
    private readonly mailcow: MailcowService,
    private readonly mailWorkspace: MailWorkspaceService,
  ) {}

  @Get()
  async status() {
    const smtp = await this.mailWorkspace.smtpHealth();
    return {
      api: {
        healthy: true,
        timestamp: new Date().toISOString(),
      },
      mailcow: await this.mailcow.connectionStatus(),
      smtp: {
        connected: smtp.success,
        status: smtp.smtp,
        error: smtp.error,
      },
    };
  }
}
