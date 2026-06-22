import { Module } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { SessionAuthGuard } from "src/common/guards/session.guard";
import { SessionCleanupService } from "./session-cleanup.service";

@Module({
  controllers: [AuthController],
  providers: [AuthService, SessionAuthGuard, SessionCleanupService],
})
export class AuthModule {}
