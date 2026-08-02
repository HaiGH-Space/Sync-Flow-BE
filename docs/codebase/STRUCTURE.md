# Codebase Structure

## Core Sections (Required)

### 1) Top-Level Map

| Path | Purpose | Evidence |
|------|---------|----------|
| `src/` | All application source code | scan output |
| `src/main.ts` | Application bootstrap entry point | `src/main.ts` |
| `src/app.module.ts` | Root NestJS module — wires all feature modules | `src/app.module.ts` |
| `src/modules/` | Feature modules (domain-organized) | scan output |
| `src/common/` | Shared guards, decorators, interceptors, DTOs, constants | scan output |
| `src/common/redis/` | Redis module and service (token storage/caching) | `src/common/redis/redis.service.ts` |
| `src/config/` | Environment configuration module and service | `src/config/config.module.ts` |
| `src/database/prisma/` | Prisma service and module (DB access layer) | `src/database/prisma/prisma.service.ts` |
| `src/providers/` | External service providers (Cloudinary, LiveKit) | `src/providers/cloudinary/`, `src/providers/livekit/` |
| `src/shared/` | Cross-cutting infrastructure (mail) | `src/shared/mail/mail.module.ts` |
| `prisma/` | Prisma schema definition | `prisma/schema.prisma` |
| `generated/` | Generated Prisma client output (do not edit) | `prisma/schema.prisma` generator block |
| `dist/` | Compiled output (do not document patterns from here) | `tsconfig.json` |
| `docs/` | Project documentation | this file |
| `eslint.config.mjs` | ESLint flat config | `eslint.config.mjs` |
| `tsconfig.json` | TypeScript compiler configuration | `tsconfig.json` |
| `nest-cli.json` | NestJS CLI configuration | `nest-cli.json` |
| `prisma.config.ts` | Prisma CLI configuration | `prisma.config.ts` |
| `.env.example` | Required environment variable template | `.env.example` |

### 2) Entry Points

- Main runtime entry: `src/main.ts` — bootstraps `AppModule`, configures global pipes, interceptors, CORS, Swagger, and starts the HTTP server.
- Secondary: None (no CLI, no worker process).
- How entry is selected: `nest start` → `nest-cli.json` → compiles `src/main.ts`.

### 3) Module Boundaries

| Boundary | What belongs here | What must not be here |
|----------|-------------------|----------------------|
| `src/modules/<domain>/` | Controller, service, DTOs, entities for one domain | Cross-domain business logic, direct Prisma access outside service |
| `src/common/` | Shared guards, decorators, interceptors, shared DTOs, error codes | Domain-specific business logic |
| `src/config/` | `AppConfigModule`, `AppConfigService`, env parsing utilities | Business logic, direct process.env access |
| `src/database/prisma/` | `PrismaService`, `PrismaModule` | Business logic, query construction |
| `src/providers/` | Third-party API wrappers (Cloudinary, LiveKit) | Domain entities, business rules |
| `src/shared/mail/` | `MailModule` (mailer setup) | Application logic |
| `generated/prisma/` | Auto-generated Prisma client — read only | Manual edits |

### 4) Feature Module Layout

Each domain module under `src/modules/<name>/` follows this internal structure:

```
<name>.controller.ts   — HTTP controller (thin, delegates to service)
<name>.service.ts      — Business logic
<name>.module.ts       — NestJS module wiring
dto/                   — Request/response DTOs (class-validator decorated)
entities/              — Response entity/view models for Swagger
```

Observed modules: `auth`, `users`, `workspaces`, `workspace-members`, `projects`, `columns`, `issues`, `sprints`, `comments`, `meetings`, `chat`, `channel`, `channel-members`, `upload`, `notifications`, `health`.

### 5) Naming and Organization Rules

- **File naming**: `kebab-case` for module files (e.g., `auth.service.ts`, `workspace-member.controller.ts`)
- **Class naming**: `PascalCase` (e.g., `AuthService`, `WorkspaceMemberController`)
- **Directory organization**: domain-first (by feature, not by layer)
- **Import paths**: No `@/` aliases — NestJS `baseUrl: "./"` means `src/modules/auth/auth.service.ts` is imported as `src/modules/auth/auth.service`. Some files use the relative root import `src/database/prisma/prisma.service` (non-alias absolute).
- **Generated code**: Prisma client imported from `generated/prisma/client` or `generated/prisma/enums`.

### 6) Evidence

- `docs/codebase/.codebase-scan.txt` — directory tree
- `src/main.ts` — bootstrap and entry
- `src/app.module.ts` — root module composition
- `src/modules/auth/` — representative full module
