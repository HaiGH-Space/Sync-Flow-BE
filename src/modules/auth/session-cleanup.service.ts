import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "src/database/prisma/prisma.service";

@Injectable()
export class SessionCleanupService {
  private readonly logger = new Logger(SessionCleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(process.env.SESSION_CLEANUP_CRON || "0 */2 * * *")
  async cleanExpiredSessions() {
    this.logger.log("Starting cleanup of expired sessions...");
    try {
      const result = await this.prisma.session.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });
      this.logger.log(`Successfully deleted ${result.count} expired sessions.`);
    } catch (error) {
      this.logger.error("Error occurred during expired session cleanup:", error);
    }
  }
}
