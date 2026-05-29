import { Module } from "@nestjs/common";
import { MongoMailService } from "./mongo-mail.service";

@Module({
  providers: [MongoMailService],
  exports: [MongoMailService],
})
export class MongoMailModule {}
