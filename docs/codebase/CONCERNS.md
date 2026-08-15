# Codebase Concerns

## Core Sections (Required)

### 1) Top Risks (Prioritized)

| Severity | Concern | Evidence | Impact | Suggested action |
| -------- | ------- | -------- | ------ | ---------------- |
| High | **Unit test coverage gaps** — 19 spec files exist covering key services, but several domain modules remain untested. | `pnpm test` output (124 tests / 19 spec files) | Regressions undetected in uncovered domains; refactoring is partially blind. | Write service-level unit tests for remaining modules (e.g., `ProjectsService`, `ColumnsService`, `SprintsService`, `WorkspaceMemberService`, `ChatService`, `CommentService`, `MeetingService`). |

### 2) Technical Debt

| Debt item | Why it exists | Where | Risk if ignored | Suggested fix |
| --------- | ------------- | ----- | --------------- | ------------- |
| - | - | - | - | - |

### 3) Security Concerns

| Risk | OWASP category | Evidence | Current mitigation | Gap |
| ------------------------------------ | ----------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| **Custom Socket.io Cookie Parser** | A01:2021-Broken Access Control / Authentication | `src/common/utils/ws-auth.ts` parses raw cookie headers for WebSocket handshakes. | Custom regex/string manipulation to handle `=` characters and strip surrounding quotes. | Ad-hoc parser could fail on edge cases or allow session spoofing/bypass if cookie values contain unexpected delimiters. |
| **Dynamic CORS configuration throw** | A05:2021-Security Misconfiguration | `src/config/config.service.ts` `corsOrigins` getter | Throws error during application bootstrap in production if `CORS_ORIGIN` contains `*` or is missing. | Incomplete format handling could cause application crashes during start-up on misconfigured environments. |

### 4) Performance and Scaling Concerns

| Concern | Evidence | Current symptom | Scaling risk | Status & Mitigation |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| **Prisma Transaction N-Query Loop for Workspace Invites** | `src/modules/notifications/notifications.service.ts` (`markWorkspaceInviteNotificationsAsRead`) | Previously mapped database updates individually inside `prisma.$transaction`. | Sequential update queries inside transaction block the database pool. | **RESOLVED**: Refactored to use a single `updateMany` batch operation for in-place bulk updates. |
| **Frequent Count Queries for Pagination** | `src/modules/projects/project.service.ts`, `src/modules/sprints/sprint.service.ts`, `src/modules/issues/issue.service.ts`, `src/modules/workspaces/workspace.service.ts` | Executes database `count` in parallel with `findMany` on list requests. | `COUNT(*)` queries degrade in performance as tables grow, causing latency issues on high-volume lists. | **RESOLVED**: Added optional `includeTotal` (boolean) parameter in `PaginationQueryDto` allowing clients to skip count queries when not needed. |

### 5) Fragile/High-Churn Areas

| Area | Why fragile | Churn signal | Safe change strategy | Status & Mitigation |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`prisma/schema.prisma`** | Central definition of database schema. Changing tables alters generated types, potentially causing compilation errors across all modules. | 19 edits recently, adding sprints, columns, issues, chat, and workspaces. | Always run `pnpm db:gen` after changes and verify with `pnpm build` immediately. | **RESOLVED**: Added `db:validate` script and automated pre-build/test schema validation (`pnpm db:validate && pnpm db:gen`) in `package.json`. |
| **`src/app.module.ts`** | Central composer of NestJS application. Easy to introduce circular dependencies or duplicate providers when merging multiple feature branches. | 24 edits recently. | Group module registrations logically. Run `pnpm build` checking for bootstrap or import errors before committing. | **RESOLVED**: Reorganized imports into 3 distinct categories (Core Infra, System, Domain Features) and added automated NestJS module compilation check in `app.module.spec.ts`. |
| **`src/modules/auth/auth.service.ts` & `src/common/guards/session.guard.ts`** | Core login, token generation, and hybrid guard stack. Single point of failure for backend security. | High commit activity (8-10 edits each). | Run auth tests suite (`pnpm test src/modules/auth`) and guard specs before and after any changes. | **RESOLVED**: Expanded boundary unit tests in `auth.service.spec.ts` (JWT logout decoding, no-op, error rethrowing) and `session.guard.spec.ts` (Authorization header precedence, expired session cleanup error handling). |

### 6) User Clarifications & Decisions

1. **Deployment Target:** Deployment is not needed right now; the team will handle deployment independently.
2. **Authorization Guards:** All project and issue resources are expected to consistently follow the verified `ProjectAccessGuard` and `IssueAccessGuard` patterns.
3. **Test Coverage:** Unit test coverage is a priority, with a target coverage goal for the remaining services.
4. **Pagination Consistency:** Query pagination is planned to be extended to other list endpoints, such as channels, chat messages, and workspace members.

### 7) Evidence

- Scan output: `HIGH-CHURN FILES` section in `docs/codebase/.codebase-scan.txt`
- `src/common/guards/session.guard.ts` — session and jwt hybrid lookup pattern
- `src/modules/notifications/notifications.service.ts` — N-query transaction update and individual WebSocket emission loop
- `src/config/config.service.ts` — production CORS restriction check
- `tsconfig.json` — `noImplicitAny: true`
- `package.json` jest config — no coverage threshold
