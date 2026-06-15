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
| Unit | Yes | Services, controllers, utilities | 12 tests across 4 spec files exist in the codebase |
| Integration | No | API endpoints | [TODO] |
| E2E | No | HTTP flows via Supertest | E2E configuration exists at `test/jest-e2e.json`, but no E2E tests are implemented yet |

### 4) Mocking and Isolation Strategy

- **Main mocking approach**: Uses standard `@nestjs/testing` `Test.createTestingModule()` patterns. External dependencies (like `PrismaService`) are replaced with custom mock objects using provider overrides (e.g., `useValue: mockPrismaService`).
- **Isolation guarantees**: Mock database layers avoid hitting a live PostgreSQL server during unit tests.
- **Common failure mode**: Mismatched mock signatures or failure to mock specific Prisma model calls (e.g., `deleteMany`, `queryRaw`).

### 5) Coverage and Quality Signals

- **Coverage tool**: Jest built-in (configured via `pnpm.cmd test:cov`)
- **Coverage threshold**: None enforced — no `coverageThreshold` in `package.json` jest config.
- **Current reported coverage**: [TODO] — no coverage reports generated in the workspace.
- **Known gaps**: Most modules in `src/modules/` lack test files. Unit tests are currently limited to `ws-auth` utility, `SessionCleanupService`, and `HealthModule` components.

### 6) Evidence

- `package.json` (jest config block) — test runner configuration
- `test/jest-e2e.json` — e2e configuration (referenced but not read; file exists per project layout)
- Scan output: no `*.spec.ts` files detected in directory tree
