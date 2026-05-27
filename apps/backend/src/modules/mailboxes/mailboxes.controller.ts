import { Body, Controller, Get, Post } from "@nestjs/common";
import { CreateMailboxDto } from "./dto/create-mailbox.dto";
import { MailboxesService } from "./mailboxes.service";

@Controller("mailboxes")
export class MailboxesController {
  constructor(private readonly mailboxesService: MailboxesService) {}

  @Get()
  listMailboxes() {
    return this.mailboxesService.listMailboxes();
  }

  @Post()
  createMailbox(@Body() body: CreateMailboxDto) {
    return this.mailboxesService.createMailbox(body.address, body.quotaMb ?? 2048);
  }
}
