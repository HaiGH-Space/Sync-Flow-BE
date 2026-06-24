import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { SessionAuthGuard } from "src/common/guards/session.guard";
import { SessionCleanupService } from "./session-cleanup.service";
import { AppConfigModule } from "src/config/config.module";
import { AppConfigService } from "src/config/config.service";

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
  providers: [AuthService, SessionAuthGuard, SessionCleanupService],
  exports: [AuthService, SessionAuthGuard, JwtModule],
})
export class AuthModule {}
