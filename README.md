<div align="center">

# Sync Flow — Backend API

_Modular NestJS REST & WebSocket service powering real-time workspace collaboration, task management, video channels, and notifications_

[![NestJS](https://img.shields.io/badge/NestJS-v11-E0234E?style=flat-square&logo=nestjs)](https://nestjs.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-v5.7-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Prisma](https://img.shields.io/badge/Prisma-v7.3-2D3748?style=flat-square&logo=prisma)](https://www.prisma.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-v16-4169E1?style=flat-square&logo=postgresql)](https://www.postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-v7-DC382D?style=flat-square&logo=redis)](https://redis.io)
[![Socket.io](https://img.shields.io/badge/Socket.io-v4.8-010101?style=flat-square&logo=socket.io)](https://socket.io)

[Features](#features) • [Tech Stack](#tech-stack) • [Getting Started](#getting-started) • [Project Structure](#project-structure) • [API & Gateway Specs](#api--gateway-specs) • [Testing](#testing--quality)

</div>

---

Sync Flow Backend is a high-performance backend monolith built with **NestJS 11**, **Prisma ORM**, **Redis**, and **Socket.IO**. It provides core authentication, workspace authorization, agile backlog boards, video conference tokens, real-time messaging, and push notifications.

## Features

- **Hybrid Authentication** — JWT session authentication cached in Redis for fast-path validation with PostgreSQL persistence and bcrypt password hashing.
- **Workspace Access Control** — Granular role management (Admin, Member, Guest) with strict resource guards.
- **Agile Boards & Issues** — Kanban columns, sprints, task priorities, and issue tracking.
- **LiveKit Video Channels** — WebRTC video/audio room token generation, participant listing, and moderation controls powered by LiveKit Server SDK.
- **Real-Time Chat & Notifications** — Namespace-segregated Socket.IO gateways (`/chat`, `/notifications`) with automated invite dispatching.
- **Media Cloud Storage** — Cloudinary CDN integration for file uploads.
- **API Documentation & Health** — OpenAPI documentation rendered via Scalar UI, paired with Terminus health checks.

---

## Tech Stack

| Component              | Technology                                    | Description                                                           |
| ---------------------- | --------------------------------------------- | --------------------------------------------------------------------- |
| **Framework**          | [NestJS v11](https://nestjs.com)              | TypeScript framework with dependency injection architecture           |
| **Language**           | TypeScript v5.7                               | Configured with strict null checks (`strictNullChecks`)               |
| **Database & ORM**     | [Prisma v7.3](https://prisma.io) + PostgreSQL | Typed database client using standard migration scripts                |
| **Caching & Session**  | Redis (`ioredis`)                             | High-performance session token caching with fallback database queries |
| **Real-Time Traffic**  | Socket.IO v4.8                                | WebSockets for messaging and system alerts                            |
| **Video Conferencing** | LiveKit SDK v2.17                             | WebRTC token signing and participant management                       |
| **Storage & Email**    | Cloudinary SDK & Nodemailer                   | CDN media hosting and Handlebars transactional email rendering        |
| **API Reference**      | Swagger + Scalar                              | Interactive API documentation hosted at `/docs`                       |

---

## Getting Started

### Prerequisites

- Node.js (v18+ LTS recommended)
- **pnpm** package manager
- Running PostgreSQL database instance
- Running Redis instance

### 1. Installation

Clone the repository and install dependencies:

```bash
pnpm install
```

### 2. Environment Configuration

Copy the sample environment file to `.env`:

```bash
cp .env.example .env
```

Configure key environment parameters:

```env
PORT=8000
DATABASE_URL="postgresql://user:password@localhost:5432/syncflow"
REDIS_URL="redis://127.0.0.1:6379"
FRONTEND_URL="http://localhost:3000"
CORS_ORIGIN="http://localhost:3000"
NODE_ENV="development"

# JWT & Session
JWT_SECRET="your-secure-jwt-secret-key"
SESSION_TTL_DAYS=7
SESSION_CLEANUP_CRON="0 */2 * * *"

# Third-Party Services
LIVEKIT_URL="ws://localhost:7880"
LIVEKIT_API_KEY="devkey"
LIVEKIT_API_SECRET="secret"

CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
```

> [!IMPORTANT]
> Verify that `DATABASE_URL` and `REDIS_URL` point to accessible local or hosted database instances before starting the server.

### 3. Database Initialization

Sync the schema to your PostgreSQL database and generate the Prisma client bindings:

```bash
pnpm db:push
pnpm db:gen
```

> [!NOTE]
> `pnpm db:gen` runs automatically on `postinstall`, `pnpm start:dev`, `pnpm build`, and `pnpm test`.

### 4. Running the Server

```bash
# Development mode with hot reload
pnpm start:dev

# Production build and execution
pnpm build
pnpm start:prod
```

- **Interactive API Documentation**: `http://localhost:8000/docs`
- **Health Check Endpoint**: `http://localhost:8000/health`

---

## Project Structure

The project follows a modular, feature-focused architecture:

```
src/
├── app.module.ts            # Core application module composition
├── main.ts                  # Bootstrap entry point (global pipes, filters, Swagger)
├── config/                  # Global AppConfigModule & AppConfigService
├── database/prisma/         # Centralized PrismaService & PrismaModule
├── common/                  # Cross-cutting concerns
│   ├── constants/           # ErrorCode enum definitions
│   ├── decorators/          # Custom decorators (@GetUser, @Roles, @ApiCommonResponses)
│   ├── filters/             # Global HttpExceptionFilter
│   ├── guards/              # SessionAuthGuard, WorkspaceRolesGuard, ProjectAccessGuard
│   ├── interceptors/        # Standard TransformInterceptor response envelope
│   └── redis/               # RedisModule & RedisService
├── modules/                 # Business domain feature modules
│   ├── auth/                # Session lifecycle & JWT token validation
│   ├── users/               # User profiles and management
│   ├── workspaces/          # Workspace management & invitation engine
│   ├── projects/            # Project containers
│   ├── columns/             # Kanban board columns
│   ├── sprints/             # Sprint iteration cycles
│   ├── issues/              # Issue tracking & backlog items
│   ├── channel/             # Communication channels & LiveKit WebRTC tokens
│   ├── chat/                # Socket.IO real-time message gateway
│   ├── notifications/       # Push notifications gateway
│   └── health/              # Terminus database health indicators
├── providers/               # Infrastructure connectors (Cloudinary, LiveKit)
└── shared/mail/             # Transactional email service
```

---

## API & Gateway Specs

### Response Envelope

All API endpoints return standard JSON responses wrapped by `TransformInterceptor`:

```json
{
  "statusCode": 200,
  "message": "Success",
  "data": { ... }
}
```

> [!NOTE]
> Server errors (500+) are automatically caught and sanitized by `HttpExceptionFilter` to prevent internal database queries or stack traces from leaking to API clients.

### Key Endpoint Reference

| Endpoint                    | Method | Guard Stack                                | Description                              |
| --------------------------- | ------ | ------------------------------------------ | ---------------------------------------- |
| `/auth/register`            | `POST` | Public                                     | Create new account                       |
| `/auth/login`               | `POST` | Public                                     | Authenticate user & issue session cookie |
| `/auth/logout`              | `POST` | `SessionAuthGuard`                         | Revoke session in Redis & database       |
| `/workspaces`               | `GET`  | `SessionAuthGuard`                         | List user workspaces                     |
| `/workspaces/:id/projects`  | `POST` | `SessionAuthGuard` + `WorkspaceRolesGuard` | Create project under workspace           |
| `/projects/:id/columns`     | `GET`  | `SessionAuthGuard` + `ProjectAccessGuard`  | Retrieve project columns                 |
| `/projects/:id/issues`      | `POST` | `SessionAuthGuard` + `ProjectAccessGuard`  | Create task issue                        |
| `/channels/:id/video/token` | `POST` | `SessionAuthGuard`                         | Generate LiveKit WebRTC access token     |
| `/health`                   | `GET`  | Public                                     | Database connection check                |

### WebSocket Gateways

Real-time connections validate authentication using the `session_token` cookie or handshake auth parameter:

- **/chat** — Subscribes to project channel messages (`join_channel`, `send_message`, `new_message`).
- **/notifications** — Pushes real-time user activity alerts (`notification_created`, `notification_updated`).

---

## Testing & Quality

Run the unit test suite built with Jest:

```bash
# Execute unit tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Generate test coverage report
pnpm test:cov
```

> [!TIP]
> Use `pnpm build` to verify production compilation and TypeScript type checking before pushing changes.
