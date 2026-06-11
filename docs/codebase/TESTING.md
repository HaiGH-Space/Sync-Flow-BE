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
- **Setup files**: [TODO] — no `jest.setup.ts` or `globalSetup` file found in scan output.
- **Test transform**: `ts-jest` handles `.ts` compilation within tests.

### 3) Test Scope Matrix

| Scope | Covered? | Typical target | Notes |
|-------|----------|----------------|-------|
| Unit | [TODO] | Services, guards | No `*.spec.ts` files detected in source scan — may not exist yet |
| Integration | [TODO] | API endpoints | [TODO] |
| E2E | [TODO] | HTTP flows via Supertest | E2E config exists at `test/jest-e2e.json`; no test files confirmed in scan |

> [!WARNING]
> The scan detected no `*.spec.ts` or `*.test.ts` files in `src/`. Unit test coverage may be absent or files may be outside the scanned depth. Verify with `find src -name "*.spec.ts"`.

### 4) Mocking and Isolation Strategy

- **Main mocking approach**: [TODO] — no test files observed. The `@nestjs/testing` `Test.createTestingModule()` pattern is the NestJS standard and is likely intended.
- **Isolation guarantees**: [TODO]
- **Common failure mode**: [TODO]

### 5) Coverage and Quality Signals

- **Coverage tool**: Jest built-in (configured via `pnpm.cmd test:cov`)
- **Coverage threshold**: None enforced — no `coverageThreshold` in `package.json` jest config.
- **Current reported coverage**: [TODO] — no CI artifacts or coverage reports found.
- **Known gaps**: All modules under `src/modules/` appear to lack unit tests based on scan output.

### 6) Evidence

- `package.json` (jest config block) — test runner configuration
- `test/jest-e2e.json` — e2e configuration (referenced but not read; file exists per project layout)
- Scan output: no `*.spec.ts` files detected in directory tree
