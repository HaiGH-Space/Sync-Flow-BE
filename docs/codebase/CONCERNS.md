# Codebase Concerns

## Core Sections (Required)

### 1) Top Risks (Prioritized)

| Severity | Concern | Evidence | Impact | Suggested action |
|----------|---------|----------|--------|-----------------|
| ~~High~~ / Medium | **Low unit test coverage** — initial test infrastructure set up, but coverage remains low | `pnpm test` output (12 tests / 4 spec files) | Regressions undetected in core domains; refactoring is partially blind | Write service-level unit tests for critical modules (`AuthService`, `WorkspaceService`, `NotificationsService`) |
| High | **Session validated on every request via DB query** — no cache | `src/common/guards/session.guard.ts` | Each authenticated request does 1 DB round-trip; won't scale | Add Redis or in-memory session cache, or sign sessions as JWTs |
| ~~Medium~~ | ~~**Duplicate WebSocket auth code** — `getAuthToken` + `parseCookies` copied verbatim in two gateways~~ | ~~`chat.gateway.ts`, `notifications.gateway.ts`~~ | ~~Auth changes must be applied twice; drift risk~~ | **Resolved** (Extracted to `src/common/utils/ws-auth.ts`) |
| ~~Medium~~ | ~~**No session expiry cleanup job** — expired sessions accumulate in DB~~ | ~~`src/common/guards/session.guard.ts` (lazy delete)~~ | ~~DB table grows unboundedly; lazy delete misses sessions of inactive users~~ | **Resolved** (Implemented scheduled cron task `SessionCleanupService` in `src/modules/auth/session-cleanup.service.ts` using `@nestjs/schedule`) |
| ~~Medium~~ | ~~**`noImplicitAny: false`** — implicit `any` permitted globally~~ | ~~`tsconfig.json`~~ | ~~Type errors can hide silently; reduces IDE assistance~~ | **Resolved** (Enabled `noImplicitAny: true` in `tsconfig.json`) |
| ~~Low~~ | ~~**No health-check endpoint**~~ | ~~Scan output (no `/health` route), `src/app.module.ts`~~ | ~~Load balancers and container orchestrators cannot probe liveness~~ | **Resolved** (Implemented `/health` check using `@nestjs/terminus` and `PrismaHealthIndicator`) |
| Low | **No CI/CD pipeline** | Scan output (no `.github/`, `.gitlab-ci.yml`, etc.) | No automated test/lint on pull requests | Set up GitHub Actions with lint + test steps |

### 2) Technical Debt

| Debt item | Why it exists | Where | Risk if ignored | Suggested fix |
|-----------|---------------|-------|-----------------|---------------|
| `console.log` / `console.error` for logging | No structured logger adopted yet | `src/database/prisma/prisma.service.ts`, `src/modules/auth/auth.service.ts`, `src/modules/auth/auth.service.ts` | Logs are unstructured, hard to query in production | Replace with NestJS `Logger` or `pino`/`winston` with JSON output |
| Email sent with inline HTML in `auth.service.ts` | Quick implementation — Handlebars adapter is set up in `MailModule` but not used in `AuthService` | `src/modules/auth/auth.service.ts` L57–61 | Hard to maintain or style email; inconsistent with the Handlebars template system | Move email body to a Handlebars template in `src/templates/` |
| ~~Hardcoded upload folder `"nestjs_uploads"` in `CloudinaryService`~~ | ~~No config for it~~ | ~~`src/providers/cloudinary/cloudinary.service.ts`~~ | ~~Cannot change folder without a code deploy~~ | **Resolved** (Configurable via `CLOUDINARY_FOLDER` env var / `AppConfigService`) |
| Session TTL hardcoded to 7 days in `AuthService` | Not configurable | `src/modules/auth/auth.service.ts` L125 | Cannot tune session lifetime without a code change | Expose as env var via `AppConfigService` |
| No `NOT_FOUND` guard on several entity reads | Service returns raw `null` | Various services | Frontend receives `{ data: null }` with 200 OK instead of 404 | Audit all `findUnique` / `findFirst` calls that lack `NotFoundException` |

### 3) Security Concerns

| Risk | OWASP category | Evidence | Current mitigation | Gap |
|------|----------------|----------|--------------------|-----|
| Session token in cookie — no `HttpOnly` / `Secure` / `SameSite` flags explicitly set | A07 Identification & Auth | `src/main.ts` — `cookieParser()` only; no `cookie-parser` options or Set-Cookie flags | Cookie transport for sessions is used | Verify and enforce `httpOnly: true`, `secure: true` (prod), `sameSite: 'lax'` when setting session cookie |
| CORS: origin value comes from env but CORS bypass risk if misconfigured | A01 Broken Access Control | `src/main.ts` L29–34 | `credentials: true` with explicit origin required | Validate `CORS_ORIGIN` env is not `*` in production |
| Cloudinary API secret in env — no rotation mechanism | A02 Cryptographic Failures | `.env.example` | Stored in env, not code | [ASK USER] — is secret rotation planned? |
| Error messages may leak internal error details | A05 Security Misconfiguration | `src/modules/auth/auth.service.ts` L76 (`INTERNAL_SERVER_ERROR` code) | `ErrorCode` constants used (not raw exception messages) | Verify NestJS exception filter does not pass raw `Error.message` to clients |
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
5. **[ASK USER]** Is the SMTP integration used for email verification in production? `AuthService.register` sends verification email inline; Handlebars templates are configured but not used for this email.
6. ~~**[ASK USER]** Should the Cloudinary upload folder (`nestjs_uploads`) be configurable per environment (dev/staging/prod)?~~ (**Resolved**: configured via `CLOUDINARY_FOLDER` env var)

### 7) Evidence

- Scan output: `HIGH-CHURN FILES` section
- `src/common/guards/session.guard.ts` — session lookup pattern
- ~~`src/modules/chat/chat.gateway.ts`, `src/modules/notifications/notifications.gateway.ts` — duplicate auth code~~ (Resolved)
- ~~`src/modules/auth/session-cleanup.service.ts` — session cleanup job~~ (Resolved)
- `src/modules/notifications/notifications.service.ts` — N-query pattern
- `tsconfig.json` — `noImplicitAny: true`
- `package.json` jest config — no coverage threshold
