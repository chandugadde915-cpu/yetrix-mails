import { Controller, Get, Req } from "@nestjs/common";
import { AuthenticatedRequest } from "../../common/auth.middleware";
import { isSuperAdmin } from "../../common/rbac";
import { AuditService } from "./audit.service";

@Controller("api/audit")
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  listEvents(@Req() req: AuthenticatedRequest) {
    return this.auditService.list(req.user?.workspaceId, isSuperAdmin(req));
  }
}
