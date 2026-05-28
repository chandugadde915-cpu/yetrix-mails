import { Module } from "@nestjs/common";
import { MailcowModule } from "../mailcow/mailcow.module";
import { StatusController } from "./status.controller";

@Module({
  imports: [MailcowModule],
  controllers: [StatusController],
})
export class StatusModule {}
