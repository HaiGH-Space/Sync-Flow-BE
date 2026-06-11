# Technology Stack

## Core Sections (Required)

### 1) Runtime Summary

| Area | Value | Evidence |
|------|-------|----------|
| Primary language | TypeScript 5.7.x | `package.json` devDependencies |
| Runtime | Node.js (version not pinned — no `.nvmrc`) | `package.json` scripts |
| Package manager | pnpm (lockfile v9) | `pnpm-lock.yaml` |
| Module/build system | NestJS CLI (`nest build`) → `dist/` | `nest-cli.json`, `package.json` scripts |
| Target ECMAScript | ES2023 (compiled CJS via `nodenext`) | `tsconfig.json` |

### 2) Production Frameworks and Dependencies

| Dependency | Version | Role in system | Evidence |
|------------|---------|----------------|----------|
| `@nestjs/common`, `@nestjs/core` | ^11.0.1 | NestJS application framework, DI container | `package.json` |
| `@nestjs/platform-express` | ^11.0.1 | HTTP transport (Express adapter) | `package.json` |
| `@nestjs/websockets`, `@nestjs/platform-socket.io` | ^11.1.19 | WebSocket gateway (Socket.IO) | `package.json` |
| `@nestjs/swagger`, `@scalar/nestjs-api-reference` | ^11.2.5 / ^1.0.22 | OpenAPI/Swagger documentation | `package.json`, `src/main.ts` |
| `@nestjs/config` | ^4.0.2 | Environment configuration | `package.json`, `src/config/` |
| `@prisma/client`, `@prisma/adapter-pg` | ^7.3.0 | ORM + PostgreSQL adapter | `package.json`, `src/database/prisma/` |
| `bcryptjs` | ^3.0.3 | Password hashing | `src/modules/auth/auth.service.ts` |
| `@nestjs-modules/mailer`, `nodemailer`, `handlebars` | ^2.0.2 / ^7.0.13 / ^4.7.8 | Transactional email with Handlebars templates | `src/shared/mail/mail.module.ts` |
| `cloudinary` | ^2.10.0 | File/image upload and CDN | `src/providers/cloudinary/` |
| `socket.io` | ^4.8.3 | WebSocket server | `package.json` |
| `cookie-parser` | ^1.4.7 | Session cookie parsing | `src/main.ts` |
| `streamifier` | ^0.1.1 | Stream file buffer for Cloudinary upload | `src/providers/cloudinary/cloudinary.service.ts` |
| `rxjs` | ^7.8.1 | Reactive primitives (NestJS internals) | `package.json` |

### 3) Development Toolchain

| Tool | Purpose | Evidence |
|------|---------|----------|
| `typescript` ^5.7.3 | TypeScript compiler | `package.json` devDependencies |
| `ts-node` ^10.9.2 | TypeScript execution for dev | `package.json` |
| `ts-jest` ^29.2.5 | Jest transform for TypeScript | `package.json` |
| `jest` ^30.0.0 | Test runner | `package.json` scripts |
| `@nestjs/testing` ^11.0.1 | NestJS testing utilities | `package.json` |
| `supertest` ^7.0.0 | HTTP E2E test client | `package.json` |
| `eslint` ^9.18.0 | Linting | `eslint.config.mjs` |
| `typescript-eslint` ^8.20.0 | TypeScript-aware ESLint rules | `eslint.config.mjs` |
| `prettier` ^3.4.2 | Code formatting | `package.json` scripts |
| `prisma` ^7.3.0 | Prisma CLI (schema push, codegen) | `package.json` |
| `class-validator` ^0.14.3 | DTO runtime validation | `package.json` |
| `class-transformer` ^0.5.1 | DTO transformation (`transform: true`) | `package.json`, `src/main.ts` |

### 4) Key Commands

```bash
pnpm.cmd install                  # install dependencies
pnpm.cmd start:dev                # run dev server with watch
pnpm.cmd build                    # production compilation (nest build)
pnpm.cmd lint                     # eslint --fix on src/
pnpm.cmd test                     # run unit tests (jest)
pnpm.cmd test:e2e                 # run e2e tests (jest --config ./test/jest-e2e.json)
pnpm.cmd test:cov                 # run tests with coverage
pnpm.cmd db:gen                   # regenerate Prisma client (after schema changes)
pnpm.cmd db:push                  # push schema to database (prisma db push)
```

### 5) Environment and Config

- Config source: `.env` file (loaded via `@nestjs/config` → `AppConfigModule`)
- Template: `.env.example`
- Required env vars:

| Var | Default | Notes |
|-----|---------|-------|
| `PORT` | `8000` | HTTP listen port |
| `DATABASE_URL` | _(required)_ | PostgreSQL connection string |
| `FRONTEND_URL` | `""` | Used in email verification links |
| `CORS_ORIGIN` | `""` | Comma-separated or single origin |
| `NODE_ENV` | `development` | Enables prod flags |
| `MAIL_HOST` | `""` | SMTP host |
| `MAIL_PORT` | `587` | SMTP port |
| `MAIL_USER` | `""` | SMTP user |
| `MAIL_PASS` | `""` | SMTP password |
| `CLOUDINARY_CLOUD_NAME` | _(required)_ | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | _(required)_ | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | _(required)_ | Cloudinary API secret |
| `DEFAULT_INVITE_EXPIRES_IN_DAYS` | `7` | Workspace invite TTL |

- `AppConfigModule` is `@Global()` — all modules can inject `AppConfigService` without re-importing.
- No Docker, no CI/CD pipeline detected.

### 6) Evidence

- `package.json` — all dependencies and scripts
- `pnpm-lock.yaml` — resolved versions
- `tsconfig.json` — compiler options
- `.env.example` — env var template
- `src/config/config.module.ts`, `src/config/config.service.ts` — config wiring
