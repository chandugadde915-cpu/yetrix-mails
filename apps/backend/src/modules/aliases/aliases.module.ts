import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { MailcowModule } from "../mailcow/mailcow.module";
import { AliasesController } from "./aliases.controller";

@Module({
  imports: [MailcowModule, AuditModule],
  controllers: [AliasesController],
})
export class AliasesModule {}
