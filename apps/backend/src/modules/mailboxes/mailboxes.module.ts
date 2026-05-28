import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { MailcowModule } from "../mailcow/mailcow.module";
import { MailboxesController } from "./mailboxes.controller";

@Module({
  imports: [MailcowModule, AuditModule],
  controllers: [MailboxesController],
})
export class MailboxesModule {}
