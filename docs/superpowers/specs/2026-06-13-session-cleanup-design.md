# Design Specification: Scheduled Session Expiry Cleanup Job

This specification outlines the design and implementation of a scheduled background task using `@nestjs/schedule` to prune expired sessions from the database.

## Background & Objective
In `sync-flow`, session expiry is checked and handled lazily in `SessionAuthGuard`. However, if inactive users do not hit any session-guarded endpoints, their expired sessions remain in the database indefinitely. Over time, the `sessions` table will grow unboundedly, leading to database bloat. 

To resolve this, we will add a scheduled background cron job to regularly delete expired sessions. By default, this job will run every 2 hours, but it will support customization via an environment variable.

## Design Details

### 1. Dependencies
We will install `@nestjs/schedule` and its TypeScript definitions:
*   `@nestjs/schedule`

### 2. Configuration
We will add `SESSION_CLEANUP_CRON` to the environment variables:
*   Default: `0 */2 * * *` (every 2 hours)
*   Configured in: `.env` and `.env.example`

We will update `AppConfigService` in `src/config/config.service.ts` to allow retrieval of this value:
```typescript
get sessionCleanupCron() {
  return this.configService.get<string>("SESSION_CLEANUP_CRON") ?? "0 */2 * * *";
}
```

### 3. Cleanup Service (`src/modules/auth/session-cleanup.service.ts`)
Create a new service dedicated to background tasks related to session cleanups:

```typescript
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
```

### 4. Auth Module Wiring (`src/modules/auth/auth.module.ts`)
Register `SessionCleanupService` as a provider in `AuthModule`.

### 5. App Module Wiring (`src/app.module.ts`)
Import `ScheduleModule.forRoot()` in `AppModule` to initialize the `@nestjs/schedule` runner.

---

## Verification Plan

### 1. Unit Tests
Create unit tests in `src/modules/auth/session-cleanup.service.spec.ts`:
*   Verify that `cleanExpiredSessions` calls `prisma.session.deleteMany` with the correct arguments (expiresAt < current Date).
*   Verify that it handles errors gracefully without throwing them out of the cron execution context (so it logs errors instead of crashing the process).

### 2. Compilation and Linting
*   Run `pnpm.cmd build` to verify no compilation errors.
*   Run `pnpm.cmd lint` to ensure code style compliance.
