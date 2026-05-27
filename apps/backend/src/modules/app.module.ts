import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DatabaseModule } from "./database/database.module";
import { DnsModule } from "./dns/dns.module";
import { DomainsModule } from "./domains/domains.module";
import { HealthModule } from "./health/health.module";
import { MailboxesModule } from "./mailboxes/mailboxes.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    HealthModule,
    DomainsModule,
    MailboxesModule,
    DnsModule,
  ],
})
export class AppModule {}
