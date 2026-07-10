# Codebase Concerns

## Core Sections (Required)

### 1) Top Risks (Prioritized)

| Severity | Concern | Evidence | Impact | Suggested action |
|----------|---------|----------|--------|-----------------|
| High | **Low unit test coverage** — Only 16 of the core service and utility modules have unit test files. | `pnpm test` output (88 tests / 16 spec files) | Regressions undetected in core domains; refactoring is partially blind. | Write service-level unit tests for remaining modules (e.g., `ProjectsService`, `ColumnsService`, `SprintsService`, `WorkspaceMemberService`, `ChannelService`, `ChatService`, `CommentService`, `MeetingService`). |

### 2) Technical Debt

| Debt item | Why it exists | Where | Risk if ignored | Suggested fix |
|-----------|---------------|-------|-----------------|---------------|
| **Hybrid Session-JWT Authentication Complexity** | To support both standard HTTP-only cookie session authentication and JWT-based authentication for WebSocket connections. | `src/modules/auth/auth.service.ts`, `src/common/guards/session.guard.ts` | High maintenance overhead; changes in cookie parsing or token signing can silently break one of the flows. | Encapsulate extraction and validation logic in dedicated helper classes and expand integration tests covering both strategies. |
| **Custom Prisma Client Output path** | Configured to output Prisma Client to `./generated/prisma` rather than standard `node_modules` to isolate code generation. | `prisma/schema.prisma` (`output = "../generated/prisma"`) | Dev tooling, local builds, or CI/CD pipelines can fail if they attempt to build or run tests before running `pnpm db:gen`. | Ensure all build scripts and CI jobs run client generation first. Consider adding a `"postinstall": "pnpm db:gen"` script. |

### 3) Security Concerns

| Risk | OWASP category | Evidence | Current mitigation | Gap |
|------|----------------|----------|--------------------|-----|
| **Custom Socket.io Cookie Parser** | A01:2021-Broken Access Control / Authentication | `src/common/utils/ws-auth.ts` parses raw cookie headers for WebSocket handshakes. | Custom regex/string manipulation to handle `=` characters and strip surrounding quotes. | Ad-hoc parser could fail on edge cases or allow session spoofing/bypass if cookie values contain unexpected delimiters. |
| **Dynamic CORS configuration throw** | A05:2021-Security Misconfiguration | `src/config/config.service.ts` `corsOrigins` getter | Throws error during application bootstrap in production if `CORS_ORIGIN` contains `*` or is missing. | Incomplete format handling could cause application crashes during start-up on misconfigured environments. |

### 4) Performance and Scaling Concerns

| Concern | Evidence | Current symptom | Scaling risk | Suggested improvement |
|---------|----------|-----------------|-------------|-----------------------|
| **Prisma Transaction N-Query Loop for Workspace Invites** | `src/modules/notifications/notifications.service.ts` (lines 120-131) | Maps database updates individually inside `prisma.$transaction`. | Sequential update queries inside transaction block the database pool. | Optimize to use `updateMany` if individual return results aren't strictly required or can be queried in bulk afterwards. |
| **Frequent Count Queries for Pagination** | `src/modules/projects/project.service.ts`, `src/modules/sprints/sprint.service.ts`, `src/modules/issues/issue.service.ts` | Executes database `count` in parallel with `findMany` on list requests. | `COUNT(*)` queries degrade in performance as tables grow, causing latency issues on high-volume lists. | Cache totals temporarily, use cursor-based pagination, or allow clients to omit total count queries. |

### 5) Fragile/High-Churn Areas

| Area | Why fragile | Churn signal | Safe change strategy |
|------|-------------|-------------|----------------------|
| **`prisma/schema.prisma`** | Central definition of database schema. Changing tables alters generated types, potentially causing compilation errors across all modules. | 19 edits recently, adding sprints, columns, issues, chat, and workspaces. | Always run `pnpm db:gen` after changes and verify with `pnpm build` immediately. |
| **`src/app.module.ts`** | Central composer of NestJS application. Easy to introduce circular dependencies or duplicate providers when merging multiple feature branches. | 24 edits recently. | Group module registrations logically. Run `pnpm build` checking for bootstrap or import errors before committing. |
| **`src/modules/auth/auth.service.ts` & `src/common/guards/session.guard.ts`** | Core login, token generation, and hybrid guard stack. Single point of failure for backend security. | High commit activity (8-10 edits each). | Run auth tests suite (`pnpm test src/modules/auth`) and guard specs before and after any changes. |


### 6) `[ASK USER]` Questions

1. **[ASK USER]** What is the intended deployment target — bare Node.js on a VM, containerized (Docker), or a managed platform (Railway, Fly.io, Vercel, etc.)? No Dockerfile or container config was found.
2. **[ASK USER]** Are all newly introduced endpoints for project and issue resources expected to consistently follow the verified `ProjectAccessGuard` and `IssueAccessGuard` patterns, or are there custom authorization roles planned?
3. **[ASK USER]** Is test coverage a current priority? Unit tests have been expanded (88 tests across 16 spec files). Is there a target coverage goal for remaining services?
4. **[ASK USER]** Since query pagination has been introduced for workspaces, projects, sprints, and issues, is there a plan to enforce this on other list endpoints such as channels, chat messages, or workspace-members?

### 7) Evidence

- Scan output: `HIGH-CHURN FILES` section in `docs/codebase/.codebase-scan.txt`
- `src/common/guards/session.guard.ts` — session and jwt hybrid lookup pattern
- `src/modules/notifications/notifications.service.ts` — N-query transaction update and individual WebSocket emission loop
- `src/config/config.service.ts` — production CORS restriction check
- `tsconfig.json` — `noImplicitAny: true`
- `package.json` jest config — no coverage threshold
