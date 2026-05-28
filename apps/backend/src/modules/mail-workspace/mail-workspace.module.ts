import { Module } from "@nestjs/common";
import { MailPublicController } from "./mail-public.controller";
import { MailWorkspaceController } from "./mail-workspace.controller";
import { MailWorkspaceService } from "./mail-workspace.service";

@Module({
  controllers: [MailWorkspaceController, MailPublicController],
  providers: [MailWorkspaceService],
})
export class MailWorkspaceModule {}
