import { Controller, Get } from "@nestjs/common";
import { AuditService } from "./audit.service";

@Controller("api/audit")
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  listEvents() {
    return this.auditService.list();
  }
}
