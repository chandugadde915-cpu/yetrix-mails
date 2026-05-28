import { Module } from "@nestjs/common";
import { AliasesController } from "./aliases.controller";

@Module({
  controllers: [AliasesController],
})
export class AliasesModule {}
