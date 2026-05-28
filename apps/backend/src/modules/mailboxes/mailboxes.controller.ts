import { Body, Controller, Delete, Get, Param, Post, Put } from "@nestjs/common";
import { MailcowService } from "../mailcow/mailcow.service";
import { CreateMailboxDto } from "./dto/create-mailbox.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { UpdateMailboxDto } from "./dto/update-mailbox.dto";

@Controller("api/mailboxes")
export class MailboxesController {
  constructor(private readonly mailcow: MailcowService) {}

  @Get()
  listMailboxes() {
    return this.mailcow.listMailboxes();
  }

  @Post()
  createMailbox(@Body() body: CreateMailboxDto) {
    return this.mailcow.addMailbox(body);
  }

  @Put(":email")
  updateMailbox(@Param("email") email: string, @Body() body: UpdateMailboxDto) {
    return this.mailcow.editMailbox(email, body);
  }

  @Delete(":email")
  deleteMailbox(@Param("email") email: string) {
    return this.mailcow.deleteMailbox(email);
  }

  @Post(":email/password")
  resetPassword(@Param("email") email: string, @Body() body: ResetPasswordDto) {
    return this.mailcow.resetMailboxPassword(email, body.password);
  }

  @Post(":email/disable")
  disableMailbox(@Param("email") email: string) {
    return this.mailcow.setMailboxActive(email, false);
  }

  @Post(":email/enable")
  enableMailbox(@Param("email") email: string) {
    return this.mailcow.setMailboxActive(email, true);
  }
}
