# Testing Patterns

## Core Sections (Required)

### 1) Test Stack and Commands

- **Primary test framework**: Jest ^30.0.0 with `ts-jest` ^29.2.5 (TypeScript transform)
- **Assertion library**: Jest built-in (`expect`)
- **HTTP E2E client**: Supertest ^7.0.0
- **NestJS testing utilities**: `@nestjs/testing` ^11.0.1

```bash
pnpm.cmd test                   # run all unit tests (jest)
pnpm.cmd test:watch             # run unit tests in watch mode
pnpm.cmd test:cov               # run unit tests with coverage report
pnpm.cmd test:e2e               # run e2e tests (./test/jest-e2e.json)
pnpm.cmd test:debug             # run jest with node --inspect-brk
```

### 2) Test Layout

- **Unit test placement**: Co-located with source (`*.spec.ts` next to implementation), per Jest config in `package.json` (`testRegex: ".*\\.spec\\.ts$"`).
- **E2E test placement**: `test/` directory at project root; separate Jest config at `test/jest-e2e.json`.
- **Naming convention**: `<module>.<type>.spec.ts` — e.g., `auth.service.spec.ts`, `app.e2e-spec.ts`.
- **Setup files**: None configured in `package.json`.
- **Test transform**: `ts-jest` handles `.ts` compilation within tests.

### 3) Test Scope Matrix

| Scope | Covered? | Typical target | Notes |
|-------|----------|----------------|-------|
| Unit | Yes | Services, controllers, utilities | 114 tests across 19 spec files exist in the codebase |
| Integration | No | API endpoints | Not configured; endpoints are verified via service-level unit tests and manual execution |
| E2E | No | HTTP flows via Supertest | Script exists in `package.json` pointing to `./test/jest-e2e.json`, but the test directory and configuration do not exist yet |

### 4) Mocking and Isolation Strategy

- **Main mocking approach**: Uses standard `@nestjs/testing` `Test.createTestingModule()` patterns. External dependencies (like `PrismaService`) are replaced with custom mock objects using provider overrides (e.g., `useValue: mockPrismaService`).
- **Isolation guarantees**: Mock database layers avoid hitting a live PostgreSQL server during unit tests.
- **Common failure mode**: Mismatched mock signatures or failure to mock specific Prisma model calls (e.g., `deleteMany`, `queryRaw`).

### 5) Coverage and Quality Signals

- **Coverage tool**: Jest built-in (configured via `pnpm.cmd test:cov`)
- **Coverage threshold**: None enforced — no `coverageThreshold` in `package.json` jest config.
- **Current reported coverage**: Statements: 69.93% (1084/1550), Branches: 56.64% (486/858), Methods: 29.51% (67/227), Lines: 69.93% (1084/1550) as of June 2026.
- **Known gaps**: Several modules in `src/modules/` still lack test files. Unit tests are currently implemented for `ws-auth` utility, `PrismaService`, `SessionCleanupService`, `SessionTokenService`, `HealthModule`, `AuthService`, `UserService`, `WorkspaceService`, `ChannelService`, `NotificationsService`, `IssueService`, `HttpExceptionFilter`, `UploadModule`, `SessionAuthGuard`, `LiveKitService`, `AppConfigService`, and `AppModule`.

### 6) Evidence

- `package.json` (jest config block) — test runner configuration
- `package.json` script — references `test/jest-e2e.json` (though the directory and config are not yet created)
- Co-located unit test files found in directory tree:
  - `src/app.module.spec.ts`
  - `src/common/filters/http-exception.filter.spec.ts`
  - `src/common/guards/session.guard.spec.ts`
  - `src/common/utils/ws-auth.spec.ts`
  - `src/config/config.service.spec.ts`
  - `src/database/prisma/prisma.service.spec.ts`
  - `src/modules/auth/auth.service.spec.ts`
  - `src/modules/auth/session-cleanup.service.spec.ts`
  - `src/modules/auth/session-token.service.spec.ts`
  - `src/modules/channel/channel.service.spec.ts`
  - `src/modules/health/health.controller.spec.ts`
  - `src/modules/health/prisma.health.spec.ts`
  - `src/modules/issues/issue.service.spec.ts`
  - `src/modules/notifications/notifications.service.spec.ts`
  - `src/modules/upload/upload.controller.spec.ts`
  - `src/modules/upload/upload.service.spec.ts`
  - `src/modules/users/user.service.spec.ts`
  - `src/modules/workspaces/workspace.service.spec.ts`
  - `src/providers/livekit/livekit.service.spec.ts`
