# Codebase Concerns

## Core Sections (Required)

### 1) Top Risks (Prioritized)

| Severity | Concern | Evidence | Impact | Suggested action |
|----------|---------|----------|--------|-----------------|
| High / Medium / Low | **Low unit test coverage** — test infrastructure has been expanded to core modules, but some modules still lack tests | `pnpm test` output (79 tests / 15 spec files) | Regressions undetected in core domains; refactoring is partially blind | Write service-level unit tests for remaining modules (e.g., `ProjectsService`, `ColumnsService`, `SprintsService`) |

### 2) Technical Debt

| Debt item | Why it exists | Where | Risk if ignored | Suggested fix |
|-----------|---------------|-------|-----------------|---------------|
| None | - | - | - | - |

### 3) Security Concerns

| Risk | OWASP category | Evidence | Current mitigation | Gap |
|------|----------------|----------|--------------------|-----|
| Session token in cookie — no `HttpOnly` / `Secure` / `SameSite` flags explicitly set | A07 Identification & Auth | `src/main.ts` — `cookieParser()` only; no `cookie-parser` options or Set-Cookie flags | Cookie transport for sessions is used | Verify and enforce `httpOnly: true`, `secure: true` (prod), `sameSite: 'lax'` when setting session cookie |
| CORS: origin value comes from env but CORS bypass risk if misconfigured | A01 Broken Access Control | `src/main.ts` L29–34 | `credentials: true` with explicit origin required | Validate `CORS_ORIGIN` env is not `*` in production |
| Missing `IssueAccessGuard` / `ProjectAccessGuard` coverage audit | A01 Broken Access Control | `src/common/guards/issue-access.guard.ts`, `project-access.guard.ts` | Guards exist | [ASK USER] — are all issue/project routes protected consistently? |

### 4) Performance and Scaling Concerns

| Concern | Evidence | Current symptom | Scaling risk | Suggested improvement |
|---------|----------|-----------------|-------------|-----------------------|
| Missing pagination on workspaces, projects, sprints, and issues list queries | Services use unpaginated `findMany` queries for these resources (e.g., `IssueService.findAll`, `WorkspaceService.findAllByUserId`) | Large payloads and database scan overhead for accounts/projects with high volume of items | Performance degradation under load | Implement cursor/offset pagination parameters or restrict maximum limits where appropriate |

### 5) Fragile/High-Churn Areas

| Area | Why fragile | Churn signal | Safe change strategy |
|------|-------------|-------------|----------------------|
| None | - | - | - |


### 6) `[ASK USER]` Questions

1. **[ASK USER]** What is the intended deployment target — bare Node.js on a VM, containerized (Docker), or a managed platform (Railway, Fly.io, Vercel, etc.)? No Dockerfile or container config was found.
2. **[ASK USER]** Are all issue and project endpoints consistently protected by `IssueAccessGuard` and `ProjectAccessGuard`? Guards exist but coverage was not fully audited.
3. **[ASK USER]** Is test coverage a current priority? Unit tests have been expanded (79 tests across 15 spec files, including `AuthService`, `WorkspaceService`, `NotificationsService`, `UserService`, `IssueService`, `UploadService`, `SessionAuthGuard`, and `AppModule`). Is there a target coverage goal for remaining services?

### 7) Evidence

- Scan output: `HIGH-CHURN FILES` section
- `src/common/guards/session.guard.ts` — session lookup pattern
- `src/modules/notifications/notifications.service.ts` — N-query pattern
- `tsconfig.json` — `noImplicitAny: true`
- `package.json` jest config — no coverage threshold
