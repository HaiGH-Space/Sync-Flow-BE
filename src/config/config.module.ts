import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppConfigService } from "./config.service";
import { parseNumber } from "./env";

const validate = (config: Record<string, unknown>) => ({
  ...config,
  PORT: parseNumber(config.PORT, 8000),
  MAIL_PORT: parseNumber(config.MAIL_PORT, 587),
});

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      validate,
    }),
  ],
  providers: [AppConfigService],
  exports: [ConfigModule, AppConfigService],
})
export class AppConfigModule {}
