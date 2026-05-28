import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthPlaceholderMiddleware } from "../common/auth-placeholder.middleware";
import { AliasesModule } from "./aliases/aliases.module";
import { DnsModule } from "./dns/dns.module";
import { DomainsModule } from "./domains/domains.module";
import { HealthModule } from "./health/health.module";
import { MailcowModule } from "./mailcow/mailcow.module";
import { MailboxesModule } from "./mailboxes/mailboxes.module";
import { StatusModule } from "./status/status.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MailcowModule,
    HealthModule,
    DomainsModule,
    MailboxesModule,
    AliasesModule,
    DnsModule,
    StatusModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthPlaceholderMiddleware).forRoutes("api/*");
  }
}
