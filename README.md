# Sync Flow — Backend API

A NestJS REST + WebSocket backend for **Sync Flow**, a project management platform with real-time chat, notifications, kanban boards, sprints, and workspace collaboration.

## Features

- **Authentication** — Email/password registration with email verification, cookie-based session management, per-device logout
- **Workspaces** — Create workspaces, invite members by email, role-based access (Admin / Member / Guest)
- **Projects & Kanban** — Projects with custom status columns and priority-ordered issues
- **Sprints** — Sprint planning with issue assignment and status tracking
- **Real-time Chat** — Socket.IO-powered channel messaging per project (`/chat` namespace)
- **Notifications** — Real-time workspace invite notifications via WebSocket (`/notifications` namespace) with REST read/unread management
- **File Uploads** — Image upload to Cloudinary with URL-based deletion
- **Health Checks** — Liveness and readiness endpoints with Prisma database connectivity verification at `/health`
- **Scheduled Tasks** — Automatic pruning of expired sessions via scheduled background tasks (cron job)
- **API Documentation** — Swagger UI via Scalar at `/docs`

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [NestJS](https://nestjs.com/) 11 |
| Language | TypeScript 5.7 (ES2023 target) |
| Database | PostgreSQL via [Prisma](https://www.prisma.io/) 7 + `@prisma/adapter-pg` |
| Real-time | Socket.IO 4 (`@nestjs/websockets`) |
| Auth | Cookie-based DB sessions + bcrypt |
| Email | Nodemailer + `@nestjs-modules/mailer` (Handlebars templates) |
| File Storage | Cloudinary SDK v2 |
| Health Checks | `@nestjs/terminus` |
| Scheduled Tasks | `@nestjs/schedule` |
| API Docs | `@nestjs/swagger` + `@scalar/nestjs-api-reference` |
| Package Manager | pnpm |

## Prerequisites

- Node.js (LTS recommended — no `.nvmrc` pinned)
- pnpm
- PostgreSQL database (local or hosted, e.g. [Neon](https://neon.tech))
- A [Cloudinary](https://cloudinary.com) account
- An SMTP server or provider (e.g. Mailtrap, Resend, Gmail)

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in all values:

```bash
cp .env.example .env
```

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | HTTP listen port | `8000` |
| `DATABASE_URL` | PostgreSQL connection string | _(required)_ |
| `FRONTEND_URL` | Frontend origin (used in email links) | _(required)_ |
| `CORS_ORIGIN` | Allowed CORS origin(s) | _(required)_ |
| `NODE_ENV` | `development` or `production` | `development` |
| `MAIL_HOST` | SMTP host | _(required)_ |
| `MAIL_PORT` | SMTP port | `587` |
| `MAIL_USER` | SMTP username | _(required)_ |
| `MAIL_PASS` | SMTP password | _(required)_ |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | _(required)_ |
| `CLOUDINARY_API_KEY` | Cloudinary API key | _(required)_ |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | _(required)_ |
| `CLOUDINARY_FOLDER` | Cloudinary upload folder name | `nestjs_uploads` |
| `DEFAULT_INVITE_EXPIRES_IN_DAYS` | Workspace invite TTL in days | `7` |

### 3. Set up the database

Push the Prisma schema to your database and generate the client:

```bash
pnpm db:push
pnpm db:gen
```

### 4. Start the development server

```bash
pnpm start:dev
```

The API will be available at `http://localhost:8000`.  
Interactive API docs are at `http://localhost:8000/docs`.

## Project Structure

```
src/
├── app.module.ts               # Root module — wires all feature modules
├── main.ts                     # Bootstrap: pipes, interceptors, CORS, Swagger
├── config/                     # Typed env config (AppConfigModule / AppConfigService)
├── database/prisma/            # PrismaService + PrismaModule
├── common/
│   ├── constants/              # ErrorCode string enum
│   ├── decorators/             # @GetUser, @GetProject, @Roles, @ApiCommonErrors
│   ├── guards/                 # SessionAuthGuard, WorkspaceRolesGuard, ProjectAccessGuard, IssueAccessGuard
│   ├── interceptors/           # TransformInterceptor (response envelope)
│   └── dto/                    # Shared DTOs (BooleanResponseDto)
├── modules/
│   ├── auth/                   # Register, login, logout, email verification (includes SessionCleanupService)
│   ├── users/                  # User profile
│   ├── workspaces/             # Workspace CRUD, member invite/accept
│   ├── workspace-members/      # Workspace member management
│   ├── projects/               # Project CRUD
│   ├── columns/                # Kanban columns
│   ├── issues/                 # Issues (tasks) with priority and order
│   ├── sprints/                # Sprint management
│   ├── comments/               # Issue comments
│   ├── meetings/               # Meeting sessions with participants
│   ├── chat/                   # Socket.IO chat gateway (/chat namespace)
│   ├── channel/                # Chat channels per project
│   ├── channel-members/        # Channel membership
│   ├── notifications/          # Real-time notifications (/notifications namespace)
│   ├── upload/                 # File upload endpoint
│   └── health/                 # Health checks for app and database liveness
├── providers/
│   └── cloudinary/             # Cloudinary upload/delete wrapper
└── shared/
    └── mail/                   # MailModule (Nodemailer + Handlebars)

prisma/
└── schema.prisma               # Database schema (source of truth)

generated/
└── prisma/                     # Auto-generated Prisma client (do not edit)
```

## Key Commands

```bash
pnpm start:dev          # Dev server with hot reload
pnpm build              # Production compilation (outputs to dist/)
pnpm start:prod         # Run compiled production build
pnpm lint               # ESLint with auto-fix
pnpm format             # Prettier format
pnpm test               # Unit tests
pnpm test:e2e           # End-to-end tests
pnpm test:cov           # Unit tests with coverage report
pnpm db:gen             # Regenerate Prisma client after schema changes
pnpm db:push            # Push schema changes to the database
```

## API Overview

All HTTP responses are wrapped in a standard envelope by `TransformInterceptor`:

```json
{
  "statusCode": 200,
  "message": "Success",
  "data": { ... }
}
```

| Domain | Base route |
|--------|-----------|
| Auth | `/auth` |
| Users | `/users` |
| Workspaces | `/workspaces` |
| Projects | `/workspaces/:workspaceId/projects` |
| Columns | `/workspaces/:workspaceId/projects/:projectId/columns` |
| Issues | `/workspaces/:workspaceId/projects/:projectId/issues` |
| Sprints | `/workspaces/:workspaceId/projects/:projectId/sprints` |
| Comments | `/workspaces/:workspaceId/projects/:projectId/issues/:issueId/comments` |
| Channels | `/workspaces/:workspaceId/projects/:projectId/channels` |
| Notifications | `/notifications` |
| Upload | `/upload` |
| Health | `/health` |

> [!TIP]
> The full interactive API reference with request/response schemas is available at `/docs` when the server is running.

## WebSocket Namespaces

Authentication over WebSocket uses the `session_token` cookie or `handshake.auth.session_token`.

| Namespace | Purpose | Key events |
|-----------|---------|-----------|
| `/chat` | Channel messaging | `join_channel`, `send_message`, `new_message` |
| `/notifications` | Real-time notifications | `notification_created`, `notification_updated` |

## Data Model Overview

```
User ──< Session          (authentication)
User ──< Account          (credential provider)
User ──< WorkspaceMember >── Workspace ──< Project
                                              ├──< Column ──< Issue
                                              ├──< Sprint
                                              └──< Channel ──< Message
Issue ──< Comment
Issue ──< Meeting >── MeetingParticipant
Workspace ──< WorkspaceInvite ──< Notification >── User
```

## Architecture Notes

- **Guard stack**: Protected workspace routes use `SessionAuthGuard` (session lookup) followed by `WorkspaceRolesGuard` (membership + role check). Both query the database directly.
- **Global config**: `AppConfigModule` is `@Global()` — all services can inject `AppConfigService` without re-importing.
- **Database access**: All Prisma operations go through the injected `PrismaService` singleton. No other database client is used.
- **Error codes**: All thrown exceptions use string constants from `src/common/constants/error-codes.ts` — not raw messages — so clients can handle errors programmatically.

## Known Limitations

- Session tokens are validated against the database on **every request** (no cache). Consider Redis for high-traffic scenarios.
- Low unit test coverage: Initial unit test infrastructure and test suites are set up (12 tests total), but core feature modules still lack tests.
- No CI/CD pipeline is configured.
