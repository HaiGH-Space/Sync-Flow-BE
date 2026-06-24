import { Global, Module } from "@nestjs/common";
import { RedisService } from "./redis.service";
import { AppConfigModule } from "src/config/config.module";

@Global()
@Module({
  imports: [AppConfigModule],
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
