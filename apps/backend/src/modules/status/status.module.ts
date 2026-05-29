import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { MailWorkspaceModule } from "../mail-workspace/mail-workspace.module";
import { MailcowModule } from "../mailcow/mailcow.module";
import { StatusController } from "./status.controller";

@Module({
  imports: [DatabaseModule, MailcowModule, MailWorkspaceModule],
  controllers: [StatusController],
})
export class StatusModule {}
