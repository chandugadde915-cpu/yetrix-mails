import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { MailcowService } from "../mailcow/mailcow.service";
import { CreateAliasDto } from "./dto/create-alias.dto";

@Controller("api/aliases")
export class AliasesController {
  constructor(private readonly mailcow: MailcowService) {}

  @Get()
  listAliases() {
    return this.mailcow.listAliases();
  }

  @Post()
  createAlias(@Body() body: CreateAliasDto) {
    return this.mailcow.addAlias(body);
  }

  @Delete(":id")
  deleteAlias(@Param("id") id: string) {
    return this.mailcow.deleteAlias(id);
  }
}
