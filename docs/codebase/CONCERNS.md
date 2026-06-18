# Codebase Concerns

## Core Sections (Required)

### 1) Top Risks (Prioritized)

| Severity | Concern | Evidence | Impact | Suggested action |
|----------|---------|----------|--------|-----------------|
| ~~High~~ / Medium | **Low unit test coverage** — initial test infrastructure set up, but coverage remains low | `pnpm test` output (12 tests / 4 spec files) | Regressions undetected in core domains; refactoring is partially blind | Write service-level unit tests for critical modules (`AuthService`, `WorkspaceService`, `NotificationsService`) |
| High | **Session validated on every request via DB query** — no cache | `src/common/guards/session.guard.ts` | Each authenticated request does 1 DB round-trip; won't scale | Add Redis or in-memory session cache, or sign sessions as JWTs |
| Low | **No CI/CD pipeline** | Scan output (no `.github/`, `.gitlab-ci.yml`, etc.) | No automated test/lint on pull requests | Set up GitHub Actions with lint + test steps |

### 2) Technical Debt

| Debt item | Why it exists | Where | Risk if ignored | Suggested fix |
|-----------|---------------|-------|-----------------|---------------|
| Session TTL hardcoded to 7 days in `AuthService` | Not configurable | `src/modules/auth/auth.service.ts` L125 | Cannot tune session lifetime without a code change | Expose as env var via `AppConfigService` |
| No `NOT_FOUND` guard on several entity reads | Service returns raw `null` | Various services | Frontend receives `{ data: null }` with 200 OK instead of 404 | Audit all `findUnique` / `findFirst` calls that lack `NotFoundException` |

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
| Session DB lookup on every request | `src/common/guards/session.guard.ts` | 1 DB query per authenticated HTTP request | Latency grows linearly with traffic | Add Redis session cache or signed JWT tokens |
| `markAllAsRead` uses N individual Prisma `update` calls in `$transaction` | `src/modules/notifications/notifications.service.ts` L79–90 | For users with many unread notifications, N queries are issued | Slow for high notification counts | Replace with `updateMany` where condition is simple |
| No pagination on some list endpoints | [ASK USER] — not fully verified across all modules | [TODO] | Full table scans possible | Audit all `findMany` calls for cursor/offset pagination |
| WebSocket gateways validate session by DB lookup on each connection | `chat.gateway.ts`, `notifications.gateway.ts` | 1 DB query per WS connect event | Spike on reconnect storms | Cache session in memory or use signed tokens |

### 5) Fragile/High-Churn Areas

| Area | Why fragile | Churn signal | Safe change strategy |
|------|-------------|-------------|----------------------|
| `src/app.module.ts` | Root module — every new feature module is added here | 8 commits in 90 days (highest churn) | Always add new modules at end of `imports[]`; do not reorder existing entries |
| `src/modules/upload/upload.controller.ts` | Actively developed; 7 commits | File upload API evolving | Add controller tests before adding new upload endpoints |
| `src/modules/users/user.service.ts` | 6 commits; unused methods recently removed per git log | API surface still settling | Check for callers before removing or renaming methods |
| `prisma/schema.prisma` | 6 commits; models actively growing | Schema still evolving | Always run `pnpm.cmd db:gen` after changes; never edit `generated/prisma/` |
| `src/modules/workspaces/workspace.service.ts` | Cross-module orchestration (calls `NotificationsService`) | 5 commits | Integration-test the invite/accept flow before modifying |
| `src/modules/notifications/notifications.service.ts` | Real-time + REST + invite flow all intertwined | 5 commits | High cyclomatic dependency; requires careful isolation when testing |

### 6) `[ASK USER]` Questions

1. **[ASK USER]** Is there a planned migration from cookie/DB sessions to JWT tokens? This shapes session-caching and scaling decisions significantly.
2. **[ASK USER]** What is the intended deployment target — bare Node.js on a VM, containerized (Docker), or a managed platform (Railway, Fly.io, Vercel, etc.)? No Dockerfile or container config was found.
3. **[ASK USER]** Are all issue and project endpoints consistently protected by `IssueAccessGuard` and `ProjectAccessGuard`? Guards exist but coverage was not fully audited.
4. **[ASK USER]** Is test coverage a current priority? Initial unit tests have been added (12 tests across 4 spec files). Is there a target coverage goal for core services (e.g. `AuthService`, `WorkspaceService`)?

### 7) Evidence

- Scan output: `HIGH-CHURN FILES` section
- `src/common/guards/session.guard.ts` — session lookup pattern
- `src/modules/notifications/notifications.service.ts` — N-query pattern
- `tsconfig.json` — `noImplicitAny: true`
- `package.json` jest config — no coverage threshold
