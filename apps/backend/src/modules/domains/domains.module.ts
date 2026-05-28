import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { DnsModule } from "../dns/dns.module";
import { MailcowModule } from "../mailcow/mailcow.module";
import { DomainsController } from "./domains.controller";

@Module({
  imports: [MailcowModule, AuditModule, DnsModule],
  controllers: [DomainsController],
})
export class DomainsModule {}
