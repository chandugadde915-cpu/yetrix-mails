import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { AuditService } from "../audit/audit.service";
import { MailcowService } from "../mailcow/mailcow.service";
import { CreateAliasDto } from "./dto/create-alias.dto";

@Controller("api/aliases")
export class AliasesController {
  constructor(
    private readonly mailcow: MailcowService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  listAliases() {
    return this.mailcow.listAliases();
  }

  @Post()
  async createAlias(@Body() body: CreateAliasDto) {
    const result = await this.mailcow.addAlias(body);
    this.auditService.record("alias.create", body.address);
    return result;
  }

  @Delete(":id")
  async deleteAlias(@Param("id") id: string) {
    const result = await this.mailcow.deleteAlias(id);
    this.auditService.record("alias.delete", id);
    return result;
  }
}
