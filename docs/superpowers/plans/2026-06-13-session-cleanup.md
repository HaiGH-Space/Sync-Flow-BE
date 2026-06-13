# Session Expiry Cleanup Job Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a scheduled background job using `@nestjs/schedule` to delete expired sessions from the database, preventing unbounded database table growth.

**Architecture:** We will install `@nestjs/schedule` and enable it in the root `AppModule`. We will create a `SessionCleanupService` in `src/modules/auth` that runs a cron job querying Prisma to delete all sessions with `expiresAt < new Date()`. The cron frequency is configurable via the `SESSION_CLEANUP_CRON` environment variable, defaulting to every 2 hours (`0 */2 * * *`).

**Tech Stack:** NestJS, `@nestjs/schedule`, Prisma, Jest

---

### Task 1: Install @nestjs/schedule Dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add dependency to package.json**
  Open `package.json` and add `@nestjs/schedule` to dependencies:
  ```json
  "@nestjs/schedule": "^4.1.2"
  ```
  Wait, let's verify NestJS versions in `package.json`. In our `package.json`, other NestJS dependencies are `^11.0.1` or `^11.1.19` (NestJS v11). The corresponding `@nestjs/schedule` version for NestJS v11 is `^4.1.2` or `@nestjs/schedule@latest`. We can specify `@nestjs/schedule` in `package.json` as `^4.1.2` (or let pnpm resolve the best v11 compatible version). Let's use `"@nestjs/schedule": "^4.1.2"`.

- [ ] **Step 2: Run pnpm install**
  Run: `pnpm.cmd install`
  Expected: Installation succeeds without errors.

- [ ] **Step 3: Commit**
  Run:
  ```powershell
  git add package.json pnpm-lock.yaml; git commit -m "chore: add @nestjs/schedule dependency"
  ```

---

### Task 2: Configure Environment Variable and Config Service

**Files:**
- Modify: `.env`
- Modify: `.env.example`
- Modify: `src/config/config.service.ts`

- [ ] **Step 1: Update .env.example**
  Add the variable with its default value:
  ```ini
  # Session cleanup cron expression (default: every 2 hours)
  SESSION_CLEANUP_CRON=0 */2 * * *
  ```

- [ ] **Step 2: Update .env**
  Add the variable:
  ```ini
  SESSION_CLEANUP_CRON=0 */2 * * *
  ```

- [ ] **Step 3: Update AppConfigService**
  Add the `sessionCleanupCron` getter to `src/config/config.service.ts`:
  ```typescript
  get sessionCleanupCron() {
    return this.configService.get<string>("SESSION_CLEANUP_CRON") ?? "0 */2 * * *";
  }
  ```

- [ ] **Step 4: Commit**
  Run:
  ```powershell
  git add .env .env.example src/config/config.service.ts; git commit -m "config: add SESSION_CLEANUP_CRON environment configuration"
  ```

---

### Task 3: Implement SessionCleanupService Unit Test

**Files:**
- Create: `src/modules/auth/session-cleanup.service.spec.ts`

- [ ] **Step 1: Write the failing unit test**
  Create `src/modules/auth/session-cleanup.service.spec.ts` with the following test cases mocking `PrismaService` behavior:
  ```typescript
  import { Test, TestingModule } from "@nestjs/testing";
  import { SessionCleanupService } from "./session-cleanup.service";
  import { PrismaService } from "src/database/prisma/prisma.service";

  describe("SessionCleanupService", () => {
    let service: SessionCleanupService;
    let prisma: PrismaService;

    const mockPrismaService = {
      session: {
        deleteMany: jest.fn().mockResolvedValue({ count: 5 }),
      },
    };

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SessionCleanupService,
          {
            provide: PrismaService,
            useValue: mockPrismaService,
          },
        ],
      }).compile();

      service = module.get<SessionCleanupService>(SessionCleanupService);
      prisma = module.get<PrismaService>(PrismaService);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it("should be defined", () => {
      expect(service).toBeDefined();
    });

    it("should delete expired sessions and log success", async () => {
      await service.cleanExpiredSessions();
      expect(prisma.session.deleteMany).toHaveBeenCalledWith({
        where: {
          expiresAt: {
            lt: expect.any(Date),
          },
        },
      });
    });

    it("should handle errors gracefully without throwing", async () => {
      mockPrismaService.session.deleteMany.mockRejectedValueOnce(new Error("DB error"));
      await expect(service.cleanExpiredSessions()).resolves.not.toThrow();
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**
  Run: `pnpm.cmd test src/modules/auth/session-cleanup.service.spec.ts`
  Expected: FAIL (No such file or directory/cannot import `session-cleanup.service`)

- [ ] **Step 3: Commit the test**
  Run:
  ```powershell
  git add src/modules/auth/session-cleanup.service.spec.ts; git commit -m "test: add session cleanup service spec"
  ```

---

### Task 4: Implement SessionCleanupService

**Files:**
- Create: `src/modules/auth/session-cleanup.service.ts`

- [ ] **Step 1: Write implementation code**
  Create the file `src/modules/auth/session-cleanup.service.ts` with the `@Cron` task scheduling:
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

- [ ] **Step 2: Run test to verify it passes**
  Run: `pnpm.cmd test src/modules/auth/session-cleanup.service.spec.ts`
  Expected: PASS

- [ ] **Step 3: Commit the service**
  Run:
  ```powershell
  git add src/modules/auth/session-cleanup.service.ts; git commit -m "feat: implement SessionCleanupService with @Cron job"
  ```

---

### Task 5: Register Cleanup Service in AuthModule

**Files:**
- Modify: `src/modules/auth/auth.module.ts`

- [ ] **Step 1: Register provider**
  Import and add `SessionCleanupService` to `providers` array in `src/modules/auth/auth.module.ts`:
  ```typescript
  // src/modules/auth/auth.module.ts
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
  ```

- [ ] **Step 2: Commit**
  Run:
  ```powershell
  git add src/modules/auth/auth.module.ts; git commit -m "feat: register SessionCleanupService in AuthModule"
  ```

---

### Task 6: Enable ScheduleModule in AppModule

**Files:**
- Modify: `src/app.module.ts`

- [ ] **Step 1: Import ScheduleModule**
  Add the `ScheduleModule.forRoot()` import to `src/app.module.ts`:
  ```typescript
  // src/app.module.ts
  // Add this import:
  import { ScheduleModule } from "@nestjs/schedule";

  // Inside the @Module imports array:
  // Add:
  // ScheduleModule.forRoot(),
  ```

- [ ] **Step 2: Verify build compilation**
  Run: `pnpm.cmd build`
  Expected: Compiled successfully.

- [ ] **Step 3: Run all unit tests**
  Run: `pnpm.cmd test`
  Expected: All tests pass.

- [ ] **Step 4: Commit**
  Run:
  ```powershell
  git add src/app.module.ts; git commit -m "feat: enable ScheduleModule in AppModule"
  ```

---

### Task 7: Run Final Linter check

**Files:**
- None (Verification task)

- [ ] **Step 1: Run linter and formatter**
  Run: `pnpm.cmd lint`
  Expected: No linting or formatting errors.
