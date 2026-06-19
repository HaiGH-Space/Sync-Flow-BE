<div align="center">

# Sync Flow — Backend API
*REST + WebSocket backend service powering real-time project management and collaboration*

[![NestJS](https://img.shields.io/badge/NestJS-v11-E0234E?style=flat-square&logo=nestjs)](https://nestjs.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-v5.7-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Prisma](https://img.shields.io/badge/Prisma-v7.3-2D3748?style=flat-square&logo=prisma)](https://www.prisma.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-v16-4169E1?style=flat-square&logo=postgresql)](https://www.postgresql.org)
[![Socket.io](https://img.shields.io/badge/Socket.io-v4.8-010101?style=flat-square&logo=socket.io)](https://socket.io)

⭐ **Real-time collaboration platform engine**

[Features](#features) • [Tech Stack](#tech-stack) • [Getting Started](#getting-started) • [Project Structure](#project-structure) • [API & Gateway Specs](#api--gateway-specs)

</div>

---

Sync Flow Backend is a robust, modular backend monolith built with **NestJS**, **Prisma**, and **Socket.io**. It provides the core business logic, session management, file uploads, real-time messaging, and live notifications that power the Sync Flow client applications.

## Features

- 🔑 **Session Authentication** - Cookie-based DB sessions with secure password hashing (`bcryptjs`) and automated periodic cleanup of expired sessions.
- 🏢 **Workspace Collaboration** - Complete management of workspaces, emails, and workspace-scoped role permissions (Admin, Member, Guest).
- 📋 **Kanban Boards & Issues** - Rich tracking of project backlogs with customizable columns, sprints, priority, and ordered issues.
- 💬 **Real-time Chat** - Socket.io-powered messaging channels nested within project spaces.
- 🔔 **Instant Notifications** - Live delivery of event alerts (such as workspace invites) over persistent WebSockets with REST status management.
- ☁️ **Media Cloud Storage** - Seamless file uploads using Cloudinary CDN with standard cleanups.
- 🏥 **Health Checks** - Diagnostic API endpoints for monitoring database and service availability.
- 📖 **OpenAPI Reference** - Complete, interactive Swagger documentation powered by Scalar.

---

## Tech Stack

| Layer | Component / Technology |
|---|---|
| **Core Framework** | [NestJS](https://nestjs.com/) v11 |
| **Language** | TypeScript v5.7 (configured with strict null checks and `noImplicitAny`) |
| **Database ORM** | [Prisma](https://www.prisma.io/) v7.3 + PostgreSQL |
| **Real-time Engine** | Socket.IO v4.8 |
| **Authentication** | Custom cookie-based database session management |
| **Email Transport** | Nodemailer + Handlebars templates (`@nestjs-modules/mailer`) |
| **Media / Storage** | Cloudinary SDK v2 |
| **API Documentation**| Swagger UI + `@scalar/nestjs-api-reference` |

---

## Getting Started

### Prerequisites
- Node.js (LTS recommended)
- **pnpm** installed globally
- A running PostgreSQL instance

### 1. Installation
Clone the repository and install the project dependencies:
```bash
pnpm install
```

### 2. Environment Configuration
Create a `.env` file in the root directory using the example file:
```bash
cp .env.example .env
```

Define the following environment variables:
```env
PORT=8000
DATABASE_URL="postgresql://neondb_owner:neondb_password@localhost/neondb"
FRONTEND_URL="http://localhost:3000"
CORS_ORIGIN="http://localhost:3000"
NODE_ENV="development"

# Mail Configuration
MAIL_HOST="smtp.mailtrap.io"
MAIL_PORT=2525
MAIL_USER="your-username"
MAIL_PASS="your-password"

# Cloudinary Storage Configuration
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
CLOUDINARY_FOLDER="sync_flow_dev"

# Session Cleanup Config
SESSION_CLEANUP_CRON="0 */2 * * *"
```

> [!WARNING]
> Ensure `DATABASE_URL` matches your actual PostgreSQL instance before executing schema pushes.

### 3. Database Initialization
Compile the database schema and generate the Prisma Client bindings:
```bash
pnpm db:push
pnpm db:gen
```

### 4. Running the App

```bash
# Start in watch/development mode
pnpm start:dev

# Start in production mode
pnpm build
pnpm start:prod
```
- Interactive API Reference: `http://localhost:8000/docs`
- Health Endpoint: `http://localhost:8000/health`

---

## Project Structure

The project follows a modular, feature-oriented structure aligned with NestJS conventions:

```
src/
├── app.module.ts            # Root module composed of all sub-modules
├── main.ts                  # App bootstrapper (interceptors, exception filter, docs)
├── config/                  # AppConfigModule providing safe environment variable access
├── database/prisma/         # Prisma database connection service
├── common/                  # Shared filters, guards, interceptors, and decorators
│   ├── constants/           # Global error codes and system constants
│   ├── decorators/          # Custom NestJS decorators (e.g. @GetUser, @Roles)
│   ├── guards/              # Authorization and access control guards
│   ├── interceptors/        # Response transformer interceptor
│   └── filters/             # Standardized HttpExceptionFilter
├── modules/                 # Modulized business domain features
│   ├── auth/                # Session lifecycle, cleanup & verification
│   ├── users/               # Member profiles
│   ├── workspaces/          # Workspace management & invitation flow
│   ├── projects/            # Project structure
│   ├── columns/             # Status boards
│   ├── issues/              # User stories, tasks and comments
│   ├── meetings/            # Audio-visual / video schedules
│   ├── chat/                # Real-time message distribution
│   ├── notifications/       # Multi-channel server notifications
│   └── health/              # Terminus indicators
├── providers/               # Infrastructure connectors (e.g., Cloudinary)
└── shared/mail/             # SMTP transactional email utility
```

---

## API & Gateway Specs

### Standard Response Envelope
All REST API responses are wrapped in a standard JSON envelope by `TransformInterceptor`:
```json
{
  "statusCode": 200,
  "message": "Success",
  "data": { ... }
}
```

### Core API Routes

| Base Endpoint | Description | Guards Applied |
|---|---|---|
| `POST /auth/register` | Register a new user account | *None* |
| `POST /auth/login` | Log in and receive a session cookie | *None* |
| `POST /auth/logout` | Revoke the active session | `SessionAuthGuard` |
| `GET /workspaces` | Retrieve user workspace list | `SessionAuthGuard` |
| `POST /workspaces/:workspaceId/projects` | Create project under workspace | `SessionAuthGuard` + `WorkspaceRolesGuard` |
| `GET /health` | Perform database check | *None* |

### WebSocket Gateways

Real-time traffic is handled over the following Socket.IO namespaces. Connection requests must supply a valid `session_token` cookie or query parameter.

- **/chat** - Real-time discussion boards.
  - *Listens to:* `join_channel`, `send_message`
  - *Broadcasts:* `new_message`
- **/notifications** - System notifications.
  - *Broadcasts:* `notification_created`, `notification_updated`

---

## Testing & Quality

All unit tests are run using the **Jest** framework and can be invoked through:
```bash
# Run unit tests
pnpm test

# Run tests with coverage
pnpm test:cov
```

> [!IMPORTANT]
> A custom `HttpExceptionFilter` is used globally to prevent internal database errors or stack traces from leaking to API clients. For internal server errors (500+), the client receives a normalized code `ErrorCode.INTERNAL_SERVER_ERROR` while the full stack trace is securely logged on the backend host.
