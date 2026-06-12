# Health Check Endpoint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a standard `/health` endpoint to the NestJS application using `@nestjs/terminus` that verifies application liveness and database readiness.

**Architecture:** We will create a `HealthModule` under `src/modules/health/` that contains a custom `PrismaHealthIndicator` and a `HealthController`. The `PrismaHealthIndicator` runs a raw Postgres connection check (`SELECT 1`) using the central `PrismaService`. This module is then imported into `AppModule`.

**Tech Stack:** NestJS, `@nestjs/terminus`, Prisma

---

### Task 1: Create Custom Prisma Health Indicator

**Files:**
- Create: `src/modules/health/prisma.health.ts`
- Test: `src/modules/health/prisma.health.spec.ts`

- [ ] **Step 1: Write the unit test**
  Create the unit test for `PrismaHealthIndicator` mocking `PrismaService` behavior.

  ```typescript
  // src/modules/health/prisma.health.spec.ts
  import { Test, TestingModule } from '@nestjs/testing';
  import { PrismaHealthIndicator } from './prisma.health';
  import { PrismaService } from '../../database/prisma/prisma.service';
  import { HealthCheckError } from '@nestjs/terminus';

  describe('PrismaHealthIndicator', () => {
    let indicator: PrismaHealthIndicator;
    let prismaService: PrismaService;

    const mockPrismaService = {
      $queryRaw: jest.fn(),
    };

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PrismaHealthIndicator,
          {
            provide: PrismaService,
            useValue: mockPrismaService,
          },
        ],
      }).compile();

      indicator = module.get<PrismaHealthIndicator>(PrismaHealthIndicator);
      prismaService = module.get<PrismaService>(PrismaService);
    });

    it('should return healthy status when database ping succeeds', async () => {
      mockPrismaService.$queryRaw.mockResolvedValueOnce([{ '1': 1 }]);
      const result = await indicator.isHealthy('database');
      expect(result).toEqual({
        database: { status: 'up' },
      });
      expect(prismaService.$queryRaw).toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringContaining('SELECT 1')]),
      );
    });

    it('should throw HealthCheckError when database ping fails', async () => {
      mockPrismaService.$queryRaw.mockRejectedValueOnce(new Error('Connection failure'));
      await expect(indicator.isHealthy('database')).rejects.toThrow(HealthCheckError);
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**
  Run: `pnpm.cmd test src/modules/health/prisma.health.spec.ts`
  Expected: FAIL (No such file or directory for `prisma.health.ts`)

- [ ] **Step 3: Write minimal implementation**
  Create the custom health indicator.

  ```typescript
  // src/modules/health/prisma.health.ts
  import { Injectable } from '@nestjs/common';
  import { HealthCheckError, HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
  import { PrismaService } from '../../database/prisma/prisma.service';

  @Injectable()
  export class PrismaHealthIndicator extends HealthIndicator {
    constructor(private readonly prisma: PrismaService) {
      super();
    }

    async isHealthy(key: string): Promise<HealthIndicatorResult> {
      try {
        await this.prisma.$queryRaw`SELECT 1`;
        return this.getStatus(key, true);
      } catch (error) {
        throw new HealthCheckError(
          'Database connection failed',
          this.getStatus(key, false, { message: (error as Error).message }),
        );
      }
    }
  }
  ```

- [ ] **Step 4: Run test to verify it passes**
  Run: `pnpm.cmd test src/modules/health/prisma.health.spec.ts`
  Expected: PASS

- [ ] **Step 5: Commit**
  Run:
  ```powershell
  git add src/modules/health/prisma.health.ts src/modules/health/prisma.health.spec.ts; git commit -m "feat(health): add custom PrismaHealthIndicator"
  ```

---

### Task 2: Create Health Controller and Module

**Files:**
- Create: `src/modules/health/health.controller.ts`
- Create: `src/modules/health/health.module.ts`
- Test: `src/modules/health/health.controller.spec.ts`

- [ ] **Step 1: Write the unit test**
  Create `src/modules/health/health.controller.spec.ts`.

  ```typescript
  // src/modules/health/health.controller.spec.ts
  import { Test, TestingModule } from '@nestjs/testing';
  import { HealthController } from './health.controller';
  import { HealthCheckService } from '@nestjs/terminus';
  import { PrismaHealthIndicator } from './prisma.health';

  describe('HealthController', () => {
    let controller: HealthController;
    let healthService: HealthCheckService;
    let prismaIndicator: PrismaHealthIndicator;

    const mockHealthCheckService = {
      check: jest.fn((checks) => {
        return Promise.all(checks.map((c) => c())).then((results) => {
          return {
            status: 'ok',
            info: Object.assign({}, ...results),
            error: {},
            details: Object.assign({}, ...results),
          };
        });
      }),
    };

    const mockPrismaHealthIndicator = {
      isHealthy: jest.fn().mockResolvedValue({
        database: { status: 'up' },
      }),
    };

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        controllers: [HealthController],
        providers: [
          {
            provide: HealthCheckService,
            useValue: mockHealthCheckService,
          },
          {
            provide: PrismaHealthIndicator,
            useValue: mockPrismaHealthIndicator,
          },
        ],
      }).compile();

      controller = module.get<HealthController>(HealthController);
      healthService = module.get<HealthCheckService>(HealthCheckService);
      prismaIndicator = module.get<PrismaHealthIndicator>(PrismaHealthIndicator);
    });

    it('should call health check with prisma health check indicator', async () => {
      const result = await controller.check();
      expect(healthService.check).toHaveBeenCalled();
      expect(prismaIndicator.isHealthy).toHaveBeenCalledWith('database');
      expect(result).toEqual({
        status: 'ok',
        info: { database: { status: 'up' } },
        error: {},
        details: { database: { status: 'up' } },
      });
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**
  Run: `pnpm.cmd test src/modules/health/health.controller.spec.ts`
  Expected: FAIL

- [ ] **Step 3: Write minimal implementation**
  Create the controller and the module.

  ```typescript
  // src/modules/health/health.controller.ts
  import { Controller, Get } from '@nestjs/common';
  import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
  import { PrismaHealthIndicator } from './prisma.health';
  import { ApiTags, ApiOperation } from '@nestjs/swagger';

  @ApiTags("Health")
  @Controller('health')
  export class HealthController {
    constructor(
      private readonly health: HealthCheckService,
      private readonly prismaHealth: PrismaHealthIndicator,
    ) {}

    @Get()
    @HealthCheck()
    @ApiOperation({ summary: 'Check the health status of the application and database' })
    async check() {
      return this.health.check([
        () => this.prismaHealth.isHealthy('database'),
      ]);
    }
  }
  ```

  ```typescript
  // src/modules/health/health.module.ts
  import { Module } from '@nestjs/common';
  import { TerminusModule } from '@nestjs/terminus';
  import { PrismaModule } from '../../database/prisma/prisma.module';
  import { HealthController } from './health.controller';
  import { PrismaHealthIndicator } from './prisma.health';

  @Module({
    imports: [TerminusModule, PrismaModule],
    controllers: [HealthController],
    providers: [PrismaHealthIndicator],
  })
  export class HealthModule {}
  ```

- [ ] **Step 4: Run test to verify it passes**
  Run: `pnpm.cmd test src/modules/health/health.controller.spec.ts`
  Expected: PASS

- [ ] **Step 5: Commit**
  Run:
  ```powershell
  git add src/modules/health/health.controller.ts src/modules/health/health.module.ts src/modules/health/health.controller.spec.ts; git commit -m "feat(health): implement HealthController and HealthModule"
  ```

---

### Task 3: Register Health Module in AppModule

**Files:**
- Modify: `src/app.module.ts`

- [ ] **Step 1: Write tests to verify importing of HealthModule (Optional/Implicit)**
  We can write a integration test or compilation check for AppModule. Since we don't have existing module unit tests, we'll run `pnpm.cmd build` as the verification.

- [ ] **Step 2: Update AppModule**
  Import `HealthModule` in `src/app.module.ts`.

  ```typescript
  // src/app.module.ts
  // Add this import:
  import { HealthModule } from "./modules/health/health.module";

  // Inside @Module imports array, add:
  // HealthModule
  ```

- [ ] **Step 3: Verify build passes**
  Run: `pnpm.cmd build`
  Expected: Production build successfully compiled.

- [ ] **Step 4: Commit**
  Run:
  ```powershell
  git add src/app.module.ts; git commit -m "feat(health): import HealthModule in AppModule"
  ```

---

### Task 4: Run E2E Health Verification and Linter Check

**Files:**
- None (Verification task)

- [ ] **Step 1: Run Linter and Formatter**
  Run: `pnpm.cmd lint`
  Expected: No linting/formatting issues in the new files.

- [ ] **Step 2: Run all tests**
  Run: `pnpm.cmd test`
  Expected: All unit tests pass, including the new ones.
