# Coding Conventions

## Core Sections (Required)

### 1) Naming Rules

| Item | Rule | Example | Evidence |
|------|------|---------|----------|
| Source files | `kebab-case` | `auth.service.ts`, `workspace-member.controller.ts` | `src/modules/*/` |
| Classes | `PascalCase` | `AuthService`, `SessionAuthGuard`, `CreateWorkspaceDto` | `src/modules/auth/auth.service.ts` |
| Methods / functions | `camelCase` | `findAllByUserId()`, `inviteMember()` | `src/modules/workspaces/workspace.service.ts` |
| Variables / properties | `camelCase` | `sessionToken`, `workspaceId` | all services |
| Constants / enum values | `UPPER_SNAKE_CASE` | `Role.ADMIN`, `Priority.HIGH`, `ErrorCode.FORBIDDEN` | `generated/prisma/enums`, `src/common/constants/error-codes.ts` |
| DTO classes | `PascalCase` + `Dto` suffix | `CreateWorkspaceDto`, `AcceptInviteDto` | `src/modules/workspaces/dto/` |
| Entity/view model classes | `PascalCase` + `Entity` suffix | `NotificationEntity`, `WorkspaceMemberProfileDto` | `src/modules/*/entities/` |
| Guard classes | `PascalCase` + `Guard` suffix | `SessionAuthGuard`, `WorkspaceRolesGuard` | `src/common/guards/` |
| Decorator functions | `PascalCase` for class decorators; `camelCase` for method decorators | `@Roles()`, `@GetUser()`, `@GetProject()` | `src/common/decorators/` |
| Prisma DB table names | `snake_case` via `@@map()` | `workspace_members`, `channel_members` | `prisma/schema.prisma` |
| Prisma column names | `snake_case` via `@map()` | `created_at`, `user_id` | `prisma/schema.prisma` |

### 2) Formatting and Linting

- **Formatter**: Prettier (^3.4.2). Run with `pnpm.cmd format` (`prettier --write "src/**/*.ts" "test/**/*.ts"`).
- **Linter**: ESLint 9 flat config (`eslint.config.mjs`) with `typescript-eslint`. Run with `pnpm.cmd lint` (`eslint "{src,apps,libs,test}/**/*.ts" --fix`).
- **Linter Ignores**: Spec files (`**/*.spec.ts`, `**/*.e2e-spec.ts`) and the flat config itself (`eslint.config.mjs`) are explicitly ignored by the linter configuration.
- **Relevant enforced rules**: TypeScript-ESLint recommended rules (exact rule list in `eslint.config.mjs`).
- **String quotes**: Double quotes (`"`) in TypeScript source files (observed across all modules).

### 3) Import and Module Conventions

- **Import paths**: No `@/` path aliases configured. Imports use either:
  - **Module-relative**: `./dto/create-workspace.dto` (within same module)
  - **Src-root absolute**: `src/database/prisma/prisma.service` (cross-module — no alias, relies on `baseUrl: "./"`)
  - **Generated client**: `generated/prisma/client`, `generated/prisma/enums`
- **No barrel `index.ts` files** observed — each file is imported directly.
- **NestJS module exports**: Each module explicitly lists `exports` in its `@Module()` decorator for what it makes available to importers.

### 4) Error and Logging Conventions

- **Error strategy**: Throw NestJS HTTP exceptions from services — not controllers.
  - `UnauthorizedException(ErrorCode.AUTH_UNAUTHORIZED)`
  - `ConflictException(ErrorCode.WORKSPACE_SLUG_EXISTS)`
  - `NotFoundException(ErrorCode.ISSUE_NOT_FOUND)`
  - All error messages use `ErrorCode` string constants from `src/common/constants/error-codes.ts`.
- **Response envelope**: All HTTP responses are automatically wrapped by `TransformInterceptor` into `{ statusCode, message, data }`. Controllers return `{ message, data }` objects.
- **Error Sanitization (Security)**: A global `HttpExceptionFilter` catches all exceptions. For any internal server error (status code >= 500, or raw unhandled errors), it automatically sanitizes the response message returned to clients to exactly `ErrorCode.INTERNAL_SERVER_ERROR`, preventing leakage of internal details (e.g. database stack traces) while logging the full exception internally.
- **Logging**: NestJS `Logger` is used across the codebase, including gateways (`new Logger("ChatGateway")`), cleanup services, database services (`PrismaService`), and core modules (`AuthService`). Unstructured `console.log` and `console.error` calls are avoided. No centralized log aggregation tool is configured.
- **Sensitive data**: No explicit redaction pattern observed. Passwords are hashed with bcrypt before storage. Session tokens are UUIDs.

### 5) TypeScript Strictness

From `tsconfig.json`:

| Setting | Value | Impact |
|---------|-------|--------|
| `strictNullChecks` | `true` | Null/undefined must be handled |
| `noImplicitAny` | `true` | Implicit `any` is not allowed |
| `strictBindCallApply` | `false` | Less strict |
| `emitDecoratorMetadata` | `true` | Required for NestJS DI |
| `experimentalDecorators` | `true` | Required for NestJS decorators |
| `isolatedModules` | `true` | Compatible with bundlers |

> [!NOTE]
> `noImplicitAny: true` is enabled, ensuring type safety and avoiding implicit any throughout the codebase.

### 6) Testing Conventions

- Test file naming: `*.spec.ts` co-located next to the implementation files in `src/`.
- Mocking strategy: Standard NestJS unit tests using `@nestjs/testing` `Test.createTestingModule()`. External dependencies like `PrismaService` are replaced with mock objects using custom provider definitions (e.g. `useValue: mockPrismaService`).
- Coverage expectation: [ASK USER] — no coverage threshold configured in `package.json` jest config. Currently, 178 tests across 27 spec files are implemented and passing.

### 7) Evidence

- `eslint.config.mjs` — linter config
- `tsconfig.json` — TypeScript strictness
- `src/common/constants/error-codes.ts` — error code pattern
- `src/modules/workspaces/workspace.service.ts` — representative service
- `src/common/interceptors/transform.interceptor.ts` — response convention
