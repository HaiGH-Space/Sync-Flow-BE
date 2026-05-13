# AGENTS.md

## Scope

- This repository is a NestJS backend. Keep changes aligned with the existing module-based architecture.
- Prefer the current layout under `src/modules/`, `src/common/`, `src/database/prisma/`, `src/providers/`, and `src/shared/mail/`.

## Codebase Conventions

- Feature folders under `src/modules/` use plural names where appropriate, such as `users`, `projects`, `issues`, and `workspace-members`.
- Prisma access is centralized through `src/database/prisma/prisma.service.ts` and `src/database/prisma/prisma.module.ts`.
- Shared decorators, guards, interceptors, DTOs, constants, and types belong in `src/common/`.
- Treat `generated/prisma/` as generated output. Do not edit generated client files manually.
- Use `src/config/config.service.ts` for typed env access instead of reading environment variables ad hoc.

## Workflow

- On Windows PowerShell, use `pnpm.cmd` for package scripts if `pnpm` is blocked by execution policy.
- After changing `prisma/schema.prisma`, regenerate the client with `pnpm.cmd db:gen`.
- Use `pnpm.cmd build` to verify production compilation, and run the narrowest relevant test or lint command for the touched area.

## Useful Commands

- `pnpm.cmd start:dev`
- `pnpm.cmd build`
- `pnpm.cmd lint`
- `pnpm.cmd test`
- `pnpm.cmd test:e2e`
- `pnpm.cmd db:push`
- `pnpm.cmd db:gen`
