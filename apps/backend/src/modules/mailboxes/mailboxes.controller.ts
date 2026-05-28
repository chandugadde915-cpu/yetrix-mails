import { Body, Controller, Delete, Get, Param, Post, Put } from "@nestjs/common";
import { AuditService } from "../audit/audit.service";
import { MailcowService } from "../mailcow/mailcow.service";
import { CreateMailboxDto } from "./dto/create-mailbox.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { UpdateMailboxDto } from "./dto/update-mailbox.dto";

@Controller("api/mailboxes")
export class MailboxesController {
  constructor(
    private readonly mailcow: MailcowService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  listMailboxes() {
    return this.mailcow.listMailboxes();
  }

  @Post()
  async createMailbox(@Body() body: CreateMailboxDto) {
    const result = await this.mailcow.addMailbox(body);
    this.auditService.record("mailbox.create", body.email);
    return result;
  }

  @Put(":email")
  async updateMailbox(@Param("email") email: string, @Body() body: UpdateMailboxDto) {
    const result = await this.mailcow.editMailbox(email, body);
    this.auditService.record("mailbox.update", email);
    return result;
  }

  @Delete(":email")
  async deleteMailbox(@Param("email") email: string) {
    const result = await this.mailcow.deleteMailbox(email);
    this.auditService.record("mailbox.delete", email);
    return result;
  }

  @Post(":email/password")
  async resetPassword(@Param("email") email: string, @Body() body: ResetPasswordDto) {
    const result = await this.mailcow.resetMailboxPassword(email, body.password);
    this.auditService.record("mailbox.password", email);
    return result;
  }

  @Post(":email/disable")
  async disableMailbox(@Param("email") email: string) {
    const result = await this.mailcow.setMailboxActive(email, false);
    this.auditService.record("mailbox.disable", email);
    return result;
  }

  @Post(":email/enable")
  async enableMailbox(@Param("email") email: string) {
    const result = await this.mailcow.setMailboxActive(email, true);
    this.auditService.record("mailbox.enable", email);
    return result;
  }
}
