import { Module } from "@nestjs/common";
import { MailWorkspaceController } from "./mail-workspace.controller";
import { MailWorkspaceService } from "./mail-workspace.service";

@Module({
  controllers: [MailWorkspaceController],
  providers: [MailWorkspaceService],
})
export class MailWorkspaceModule {}
