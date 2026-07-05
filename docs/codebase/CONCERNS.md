# Codebase Concerns

## Core Sections (Required)

### 1) Top Risks (Prioritized)

| Severity | Concern | Evidence | Impact | Suggested action |
|----------|---------|----------|--------|-----------------|
| High / Medium / Low | **Low unit test coverage** — test infrastructure has been expanded to core modules, but some modules still lack tests | `pnpm test` output (87 tests / 16 spec files) | Regressions undetected in core domains; refactoring is partially blind | Write service-level unit tests for remaining modules (e.g., `ProjectsService`, `ColumnsService`, `SprintsService`) |

### 2) Technical Debt

| Debt item | Why it exists | Where | Risk if ignored | Suggested fix |
|-----------|---------------|-------|-----------------|---------------|
| None | - | - | - | - |

### 3) Security Concerns

| Risk | OWASP category | Evidence | Current mitigation | Gap |
|------|----------------|----------|--------------------|-----|
| None | - | - | - | - |

### 4) Performance and Scaling Concerns

| Concern | Evidence | Current symptom | Scaling risk | Suggested improvement |
|---------|----------|-----------------|-------------|-----------------------|
| None | - | - | - | - |

### 5) Fragile/High-Churn Areas

| Area | Why fragile | Churn signal | Safe change strategy |
|------|-------------|-------------|----------------------|
| None | - | - | - |


### 6) `[ASK USER]` Questions

1. **[ASK USER]** What is the intended deployment target — bare Node.js on a VM, containerized (Docker), or a managed platform (Railway, Fly.io, Vercel, etc.)? No Dockerfile or container config was found.
2. **[ASK USER]** Are all newly introduced endpoints for project and issue resources expected to consistently follow the verified `ProjectAccessGuard` and `IssueAccessGuard` patterns, or are there custom authorization roles planned?
3. **[ASK USER]** Is test coverage a current priority? Unit tests have been expanded (87 tests across 16 spec files, including `AuthService`, `WorkspaceService`, `NotificationsService`, `UserService`, `IssueService`, `UploadService`, `SessionAuthGuard`, `AppConfigService`, and `AppModule`). Is there a target coverage goal for remaining services?

### 7) Evidence

- Scan output: `HIGH-CHURN FILES` section
- `src/common/guards/session.guard.ts` — session lookup pattern
- `src/modules/notifications/notifications.service.ts` — N-query pattern
- `tsconfig.json` — `noImplicitAny: true`
- `package.json` jest config — no coverage threshold
