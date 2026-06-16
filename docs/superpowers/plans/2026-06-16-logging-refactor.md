# Logging Refactoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace unstructured `console.log` and `console.error` calls with the NestJS `Logger` class across `PrismaService` and `AuthService`.

**Architecture:** Use NestJS `Logger` with a context name (class name) as class properties, allowing appropriate routing of logs to standard streams with log levels (`log`, `debug`, `error`). Write unit tests utilizing Jest spies on the `Logger` to verify appropriate output.

**Tech Stack:** NestJS, TypeScript, Jest, Prisma.

---

### Task 1: Refactor AuthService Logging

**Files:**
- Create: `src/modules/auth/auth.service.spec.ts`
- Modify: `src/modules/auth/auth.service.ts`

- [ ] **Step 1: Write unit tests for AuthService logging behavior**
  Create `src/modules/auth/auth.service.spec.ts` asserting that `Logger.prototype.debug` and `Logger.prototype.error` are called in the appropriate contexts.
  Code for `src/modules/auth/auth.service.spec.ts`:
  ```typescript
  import { Test, TestingModule } from "@nestjs/testing";
  import { AuthService } from "./auth.service";
  import { PrismaService } from "src/database/prisma/prisma.service";
  import { MailerService } from "@nestjs-modules/mailer/dist/mailer.service";
  import { AppConfigService } from "src/config/config.service";
  import { Logger } from "@nestjs/common";

  describe("AuthService Logging", () => {
    let service: AuthService;
    let loggerDebugSpy: jest.SpyInstance;
    let loggerErrorSpy: jest.SpyInstance;

    const mockPrismaService = {
      user: {
        findUnique: jest.fn(),
      },
      verification: {
        create: jest.fn(),
      },
      account: {
        create: jest.fn(),
      },
      session: {
        deleteMany: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const mockMailerService = {
      sendMail: jest.fn().mockResolvedValue(true),
    };

    const mockConfigService = {
      frontendUrl: "http://localhost:3000",
    };

    beforeEach(async () => {
      loggerDebugSpy = jest.spyOn(Logger.prototype, "debug").mockImplementation();
      loggerErrorSpy = jest.spyOn(Logger.prototype, "error").mockImplementation();

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AuthService,
          { provide: PrismaService, useValue: mockPrismaService },
          { provide: MailerService, useValue: mockMailerService },
          { provide: AppConfigService, useValue: mockConfigService },
        ],
      }).compile();

      service = module.get<AuthService>(AuthService);
    });

    afterEach(() => {
      jest.restoreAllMocks();
      jest.clearAllMocks();
    });

    it("should log the verification link as debug log on registration success", async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrismaService);
      });
      mockPrismaService.user.create = jest.fn().mockResolvedValue({
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
      });

      await service.register({
        email: "test@example.com",
        password: "password123",
        name: "Test User",
      });

      expect(loggerDebugSpy).toHaveBeenCalledWith(
        expect.stringContaining("Verification Link: http://localhost:3000/verify-email?token=")
      );
    });

    it("should log errors when registration fails", async () => {
      mockPrismaService.user.findUnique.mockRejectedValue(new Error("DB error"));

      await expect(
        service.register({
          email: "test@example.com",
          password: "password123",
          name: "Test User",
        })
      ).rejects.toThrow();

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        "Register Error:",
        expect.stringContaining("DB error")
      );
    });

    it("should log errors when session deletion on logout fails", async () => {
      mockPrismaService.session.deleteMany.mockRejectedValue(new Error("Delete session error"));

      await expect(service.logoutByToken("token-123")).rejects.toThrow("Delete session error");

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        "Error deleting session on logout:",
        expect.stringContaining("Delete session error")
      );
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**
  Run: `pnpm.cmd test src/modules/auth/auth.service.spec.ts`
  Expected: FAIL (spies on Logger.prototype.debug / error not called because console.log/error are currently used).

- [ ] **Step 3: Update AuthService to use NestJS Logger**
  Modify `src/modules/auth/auth.service.ts` to instantiate a private `Logger` class property and use it instead of `console`.
  Code changes in `src/modules/auth/auth.service.ts`:
  ```typescript
  // Add Logger to imports from @nestjs/common:
  import {
    ConflictException,
    Injectable,
    InternalServerErrorException,
    UnauthorizedException,
    Logger,
  } from "@nestjs/common";

  // Inside AuthService class, add logger property:
  private readonly logger = new Logger(AuthService.name);

  // Replace console.log("Verification Link:", verificationLink); with:
  this.logger.debug(`Verification Link: ${verificationLink}`);

  // Replace console.error("Register Error:", error); with:
  this.logger.error("Register Error:", error instanceof Error ? error.stack : String(error));

  // Replace console.error("Error deleting session on logout:", error); with:
  this.logger.error("Error deleting session on logout:", error instanceof Error ? error.stack : String(error));
  ```

- [ ] **Step 4: Run test to verify it passes**
  Run: `pnpm.cmd test src/modules/auth/auth.service.spec.ts`
  Expected: PASS

- [ ] **Step 5: Commit**
  Run:
  ```bash
  git add src/modules/auth/auth.service.ts src/modules/auth/auth.service.spec.ts
  git commit -m "refactor(auth): use NestJS Logger instead of console.log/console.error"
  ```

---

### Task 2: Refactor PrismaService Logging

**Files:**
- Create: `src/database/prisma/prisma.service.spec.ts`
- Modify: `src/database/prisma/prisma.service.ts`

- [ ] **Step 1: Write unit tests for PrismaService logging**
  Create `src/database/prisma/prisma.service.spec.ts` verifying that `Logger.prototype.log` is called on database instantiation.
  Code for `src/database/prisma/prisma.service.spec.ts`:
  ```typescript
  import { Test, TestingModule } from "@nestjs/testing";
  import { PrismaService } from "./prisma.service";
  import { AppConfigService } from "src/config/config.service";
  import { Logger } from "@nestjs/common";

  jest.mock("generated/prisma/client", () => {
    return {
      PrismaClient: class {
        constructor() {}
      },
    };
  });

  jest.mock("@prisma/adapter-pg", () => {
    return {
      PrismaPg: class {
        constructor() {}
      },
    };
  });

  describe("PrismaService", () => {
    let loggerLogSpy: jest.SpyInstance;

    beforeEach(() => {
      loggerLogSpy = jest.spyOn(Logger.prototype, "log").mockImplementation();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("should log connection message on instantiation", async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PrismaService,
          {
            provide: AppConfigService,
            useValue: { databaseUrl: "postgresql://localhost:5432" },
          },
        ],
      }).compile();

      module.get<PrismaService>(PrismaService);
      expect(loggerLogSpy).toHaveBeenCalledWith("[🐛] Connected to the database");
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**
  Run: `pnpm.cmd test src/database/prisma/prisma.service.spec.ts`
  Expected: FAIL (spy on Logger.prototype.log not called because console.log is currently used).

- [ ] **Step 3: Update PrismaService to use NestJS Logger**
  Modify `src/database/prisma/prisma.service.ts` to import `Logger` from `@nestjs/common`, instantiate `private readonly logger = new Logger(PrismaService.name);`, and replace `console.log("[🐛] Connected to the database");` with `this.logger.log("[🐛] Connected to the database");`.
  Code changes in `src/database/prisma/prisma.service.ts`:
  ```typescript
  import { Injectable, Logger } from "@nestjs/common";
  import { PrismaClient } from "generated/prisma/client";
  import { PrismaPg } from "@prisma/adapter-pg";
  import { AppConfigService } from "src/config/config.service";

  @Injectable()
  export class PrismaService extends PrismaClient {
    private readonly logger = new Logger(PrismaService.name);

    constructor(configService: AppConfigService) {
      const databaseUrl = configService.databaseUrl;
      const adapter = new PrismaPg({ connectionString: databaseUrl });
      this.logger.log("[🐛] Connected to the database");
      super({ adapter });
    }
  }
  ```

- [ ] **Step 4: Run test to verify it passes**
  Run: `pnpm.cmd test src/database/prisma/prisma.service.spec.ts`
  Expected: PASS

- [ ] **Step 5: Commit**
  Run:
  ```bash
  git add src/database/prisma/prisma.service.ts src/database/prisma/prisma.service.spec.ts
  git commit -m "refactor(prisma): use NestJS Logger instead of console.log for db connection message"
  ```

---

### Task 3: Global Verification

**Files:**
- Modify: `docs/codebase/INTEGRATIONS.md`, `docs/codebase/CONVENTIONS.md`, `docs/codebase/CONCERNS.md`

- [ ] **Step 1: Check code linting**
  Run: `pnpm.cmd lint`
  Expected: PASS with zero warnings/errors in the modified/created files.

- [ ] **Step 2: Check production build**
  Run: `pnpm.cmd build`
  Expected: PASS with no compilation issues.

- [ ] **Step 3: Verify all tests**
  Run: `pnpm.cmd test`
  Expected: PASS (6 Test Suites passed).

- [ ] **Step 4: Update Documentation**
  Update the documentation files referencing this technical debt:
  - `docs/codebase/INTEGRATIONS.md:40` - Replace reference of `console.log` / `console.error` with the NestJS `Logger`.
  - `docs/codebase/CONVENTIONS.md:45` - Update references to mention that services use structured logging.
  - `docs/codebase/CONCERNS.md:21` - Remove or mark this technical debt item as completed/resolved.

- [ ] **Step 5: Commit documentation updates**
  Run:
  ```bash
  git add docs/codebase/INTEGRATIONS.md docs/codebase/CONVENTIONS.md docs/codebase/CONCERNS.md
  git commit -m "docs: update integrations, conventions, and concerns docs to reflect logging refactoring"
  ```
