import { Module } from "@nestjs/common";
import { MongoMailModule } from "../mongo-mail/mongo-mail.module";
import { MailPublicController } from "./mail-public.controller";
import { MailWorkspaceController } from "./mail-workspace.controller";
import { MailWorkspaceService } from "./mail-workspace.service";

@Module({
  imports: [MongoMailModule],
  controllers: [MailWorkspaceController, MailPublicController],
  providers: [MailWorkspaceService],
  exports: [MailWorkspaceService],
})
export class MailWorkspaceModule {}
