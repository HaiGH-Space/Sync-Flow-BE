# AGENTS.md

## Scope

- This repository is a NestJS backend. Keep changes aligned with the existing module-based architecture.
- Prefer the current layout under `src/modules/`, `src/common/`, `src/database/prisma/`, `src/providers/`, and `src/shared/mail/`.

## Architecture

- Feature code lives under `src/modules/` and is organized by domain, not by framework layer.
- Module folders are plural where appropriate, such as `users`, `projects`, `issues`, `workspace-members`, and `channel-members`.
- Keep shared cross-cutting code in `src/common/`, infrastructure code in `src/database/prisma/` and `src/providers/`, and mail code in `src/shared/mail/`.
- Treat `generated/prisma/` as generated output only; do not edit generated client files manually.

## Codebase Conventions

- Prisma access is centralized through `src/database/prisma/prisma.service.ts` and `src/database/prisma/prisma.module.ts`.
- Use `src/config/config.service.ts` for typed env access instead of reading environment variables ad hoc.
- DTOs live in module-local `dto/` folders unless they are truly shared.
- Entity/view models live in module-local `entities/` folders unless they are truly shared.
- Shared decorators, guards, interceptors, DTOs, constants, and types belong in `src/common/`.

## API Patterns

- Controllers are thin and should delegate business logic to services.
- Workspace-scoped endpoints usually use nested routes such as `workspaces/:workspaceId/...`.
- Protect workspace resources with the existing guard stack when required, often combining `SessionAuthGuard` with `WorkspaceRolesGuard`.
- Add Swagger decorators for new endpoints, especially `@ApiTags()`, `@ApiCommonErrors()`, and the generic response helpers.
- The global response interceptor wraps responses, so keep controller return values shaped for that convention.

## Prisma And Data Access

- Keep Prisma reads and writes inside services that inject `PrismaService`.
- After changing `prisma/schema.prisma`, regenerate the client with `pnpm.cmd db:gen`.
- Do not hand-edit anything under `generated/prisma/`.

## Validation And DTOs

- Validation is strict; prefer explicit DTOs with `class-validator` and Swagger metadata.
- Use nested `dto/` folders for request and response payloads that are specific to a module.
- Reuse existing shared DTOs only when the shape is genuinely shared across modules.

## Workflow

- On Windows PowerShell, use `pnpm.cmd` for package scripts if `pnpm` is blocked by execution policy.
- Use `pnpm.cmd build` to verify production compilation, and run the narrowest relevant test or lint command for the touched area.

## Commands

- `pnpm.cmd start:dev` for local development
- `pnpm.cmd build` for production compilation checks
- `pnpm.cmd lint` for linting the touched area
- `pnpm.cmd test` and `pnpm.cmd test:e2e` for unit and end-to-end coverage
- `pnpm.cmd db:push` to sync schema to the database
- `pnpm.cmd db:gen` after Prisma schema edits
