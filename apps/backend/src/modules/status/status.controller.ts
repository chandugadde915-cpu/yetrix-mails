import { Controller, Get } from "@nestjs/common";
import { MailcowService } from "../mailcow/mailcow.service";

@Controller("api/status")
export class StatusController {
  constructor(private readonly mailcow: MailcowService) {}

  @Get()
  async status() {
    return {
      api: {
        healthy: true,
        timestamp: new Date().toISOString(),
      },
      mailcow: await this.mailcow.connectionStatus(),
    };
  }
}
