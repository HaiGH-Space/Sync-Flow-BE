import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { SessionAuthGuard } from "src/common/guards/session.guard";
import { SessionCleanupService } from "./session-cleanup.service";
import { AppConfigModule } from "src/config/config.module";
import { AppConfigService } from "src/config/config.service";
import { SessionTokenService } from "./session-token.service";

@Module({
  imports: [
    AppConfigModule,
    JwtModule.registerAsync({
      global: true,
      imports: [AppConfigModule],
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        secret: config.jwtSecret,
        signOptions: { expiresIn: `${config.sessionTtlDays}d` },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, SessionAuthGuard, SessionCleanupService, SessionTokenService],
  exports: [AuthService, SessionAuthGuard, JwtModule, SessionTokenService],
})
export class AuthModule {}
