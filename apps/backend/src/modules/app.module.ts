import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthMiddleware } from "../common/auth.middleware";
import { AliasesModule } from "./aliases/aliases.module";
import { AuditModule } from "./audit/audit.module";
import { AuthModule } from "./auth/auth.module";
import { DatabaseModule } from "./database/database.module";
import { DnsModule } from "./dns/dns.module";
import { DomainsModule } from "./domains/domains.module";
import { HealthModule } from "./health/health.module";
import { MailcowModule } from "./mailcow/mailcow.module";
import { MailWorkspaceModule } from "./mail-workspace/mail-workspace.module";
import { MailboxesModule } from "./mailboxes/mailboxes.module";
import { StatusModule } from "./status/status.module";
import { TenancyModule } from "./tenancy/tenancy.module";
import { WorkspacesModule } from "./workspaces/workspaces.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    AuditModule,
    TenancyModule,
    MailcowModule,
    HealthModule,
    WorkspacesModule,
    DomainsModule,
    MailboxesModule,
    AliasesModule,
    MailWorkspaceModule,
    DnsModule,
    StatusModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes("api/*");
  }
}
