# Codebase Concerns

## Core Sections (Required)

### 1) Top Risks (Prioritized)

| Severity | Concern | Evidence | Impact | Suggested action |
|----------|---------|----------|--------|-----------------|
| ~~High~~ / ~~Medium~~ / Low | **Low unit test coverage** — test infrastructure has been expanded to core modules, but some modules still lack tests | `pnpm test` output (62 tests / 13 spec files) | Regressions undetected in core domains; refactoring is partially blind | Write service-level unit tests for remaining modules (e.g., `ProjectsService`, `ColumnsService`, `SprintsService`) |
| High | **Session validated on every request via DB query** — no cache | `src/common/guards/session.guard.ts` | Each authenticated request does 1 DB round-trip; won't scale | Add Redis or in-memory session cache, or sign sessions as JWTs |
| Low | **No CI/CD pipeline** | Scan output (no `.github/`, `.gitlab-ci.yml`, etc.) | No automated test/lint on pull requests | Set up GitHub Actions with lint + test steps |

### 2) Technical Debt

| Debt item | Why it exists | Where | Risk if ignored | Suggested fix |
|-----------|---------------|-------|-----------------|---------------|
| None | - | - | - | - |

### 3) Security Concerns

| Risk | OWASP category | Evidence | Current mitigation | Gap |
|------|----------------|----------|--------------------|-----|
| Session token in cookie — no `HttpOnly` / `Secure` / `SameSite` flags explicitly set | A07 Identification & Auth | `src/main.ts` — `cookieParser()` only; no `cookie-parser` options or Set-Cookie flags | Cookie transport for sessions is used | Verify and enforce `httpOnly: true`, `secure: true` (prod), `sameSite: 'lax'` when setting session cookie |
| CORS: origin value comes from env but CORS bypass risk if misconfigured | A01 Broken Access Control | `src/main.ts` L29–34 | `credentials: true` with explicit origin required | Validate `CORS_ORIGIN` env is not `*` in production |
| Cloudinary API secret in env — no rotation mechanism | A02 Cryptographic Failures | `.env.example` | Stored in env, not code | [ASK USER] — is secret rotation planned? |
| Missing `IssueAccessGuard` / `ProjectAccessGuard` coverage audit | A01 Broken Access Control | `src/common/guards/issue-access.guard.ts`, `project-access.guard.ts` | Guards exist | [ASK USER] — are all issue/project routes protected consistently? |

### 4) Performance and Scaling Concerns

| Concern | Evidence | Current symptom | Scaling risk | Suggested improvement |
|---------|----------|-----------------|-------------|-----------------------|
| Session DB lookup on every request | `src/common/guards/session.guard.ts` | 1 DB query per authenticated HTTP request | Latency grows linearly with traffic | Migrating to stateless JWT tokens (Planned) |
| `markAllAsRead` uses N individual Prisma `update` calls in `$transaction` | `src/modules/notifications/notifications.service.ts` L79–90 | For users with many unread notifications, N queries are issued | Slow for high notification counts | Replace with `updateMany` where condition is simple |
| No pagination on some list endpoints | [ASK USER] — not fully verified across all modules | [TODO] | Full table scans possible | Audit all `findMany` calls for cursor/offset pagination |
| WebSocket gateways validate session by DB lookup on each connection | `chat.gateway.ts`, `notifications.gateway.ts` | 1 DB query per WS connect event | Spike on reconnect storms | Cache session in memory or use signed tokens |

### 5) Fragile/High-Churn Areas

| Area | Why fragile | Churn signal | Safe change strategy |
|------|-------------|-------------|----------------------|
| ~~`src/app.module.ts`~~ | **Resolved** — Import order prefix locked down in `app.module.spec.ts` | Root module verification | Test suite verifies import ordering of core modules to prevent regression |
| ~~`src/modules/users/user.service.ts`~~ | **Resolved** — Expanded unit test coverage in `user.service.spec.ts` | API surface test stability | Full test coverage for update and avatar actions to catch accidental signature changes |
| ~~`prisma/schema.prisma`~~ | **Resolved** — Automatic client generation chained via `package.json` scripts | Client auto-sync | Never manually edit generated client; `db:gen` runs automatically on dev/test/build |

### 6) `[ASK USER]` Questions

1. **[ASK USER]** What is the intended deployment target — bare Node.js on a VM, containerized (Docker), or a managed platform (Railway, Fly.io, Vercel, etc.)? No Dockerfile or container config was found.
2. **[ASK USER]** Are all issue and project endpoints consistently protected by `IssueAccessGuard` and `ProjectAccessGuard`? Guards exist but coverage was not fully audited.
3. **[ASK USER]** Is test coverage a current priority? Unit tests have been expanded (62 tests across 13 spec files, including `AuthService`, `WorkspaceService`, `NotificationsService`, `UserService`, `IssueService`, and `UploadService`). Is there a target coverage goal for remaining services?

### 7) Evidence

- Scan output: `HIGH-CHURN FILES` section
- `src/common/guards/session.guard.ts` — session lookup pattern
- `src/modules/notifications/notifications.service.ts` — N-query pattern
- `tsconfig.json` — `noImplicitAny: true`
- `package.json` jest config — no coverage threshold
