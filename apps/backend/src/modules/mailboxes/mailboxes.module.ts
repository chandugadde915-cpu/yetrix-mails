import { Module } from "@nestjs/common";
import { MailboxesController } from "./mailboxes.controller";

@Module({
  controllers: [MailboxesController],
})
export class MailboxesModule {}
