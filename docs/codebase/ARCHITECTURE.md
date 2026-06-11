# Architecture

## Core Sections (Required)

### 1) Architectural Style

- **Primary style**: Feature-modular monolith with layered internals (Controller → Service → Prisma).
- **Classification rationale**: Each domain lives in its own NestJS module folder under `src/modules/`. Within each module, the classic layered pattern (controller → service → data) is enforced. There is no shared repository layer — services call `PrismaService` directly.
- **Primary constraints**:
  1. NestJS DI container owns all lifecycle management; no manual instantiation.
  2. `PrismaService` is the only sanctioned database-access mechanism (centralized in `src/database/prisma/`).
  3. Global modules (`AppConfigModule`, `PrismaModule`, `MailModule`) are available to all features without explicit import.

### 2) System Flow

#### HTTP Request Flow

```text
Client HTTP Request
  → src/main.ts (cookie-parser middleware, global ValidationPipe, TransformInterceptor)
  → Feature Controller (e.g., WorkspaceController)
    → SessionAuthGuard (cookie-based session lookup via PrismaService)
    → WorkspaceRolesGuard (workspace membership + role check via PrismaService)
  → Feature Service (business logic, Prisma queries)
  → PrismaService (PostgreSQL via @prisma/adapter-pg)
  → TransformInterceptor wraps response: { statusCode, message, data }
  → HTTP Response to Client
```

#### WebSocket Flow (Chat / Notifications)

```text
Client WebSocket connect (socket.io)
  → ChatGateway / NotificationsGateway (handleConnection)
    → reads session_token from cookie or handshake.auth
    → validates session via PrismaService.session.findUnique
    → stores userId on client.data
  → SubscribeMessage handlers (e.g., send_message, join_channel)
    → ChatService business logic + PrismaService write
    → server.to(room).emit(...) for broadcast
```

#### Invitation + Notification Flow

```text
POST /workspaces/:id/invite
  → WorkspaceService.inviteMember()
    → PrismaService.workspaceInvite.upsert()
    → NotificationsService.createWorkspaceInviteNotification()
      → PrismaService.notification.upsert()
      → NotificationsGateway.emitNotificationCreated() → real-time push to recipient
```

### 3) Layer/Module Responsibilities

| Layer or module | Owns | Must not own | Evidence |
|-----------------|------|--------------|----------|
| Controllers | Route handling, param extraction, guard application, HTTP response shape | Business logic, direct Prisma calls | `src/modules/*/` controllers |
| Services | Business rules, orchestration, Prisma queries, error throwing | HTTP concern, session management | `src/modules/*/` services |
| `PrismaService` | Database connection and all query execution | Business logic | `src/database/prisma/prisma.service.ts` |
| Guards (`SessionAuthGuard`, `WorkspaceRolesGuard`) | Auth/authz enforcement | Business logic, response shaping | `src/common/guards/` |
| `TransformInterceptor` | Wrapping all HTTP responses in `{ statusCode, message, data }` | Business logic | `src/common/interceptors/transform.interceptor.ts` |
| `AppConfigService` | Typed access to all env vars | Config mutation, business logic | `src/config/config.service.ts` |
| Gateways (`ChatGateway`, `NotificationsGateway`) | WebSocket lifecycle, auth-over-socket, room management, event emission | HTTP, database queries (except session lookup) | `src/modules/chat/chat.gateway.ts`, `src/modules/notifications/notifications.gateway.ts` |
| `CloudinaryService` | File upload, URL parsing, CDN deletion | Domain business rules | `src/providers/cloudinary/cloudinary.service.ts` |
| `MailModule` / `MailerService` | SMTP email dispatch with Handlebars templates | Template content decisions | `src/shared/mail/mail.module.ts` |

### 4) Reused Patterns

| Pattern | Where found | Why it exists |
|---------|-------------|---------------|
| Global `@Injectable()` singleton | `PrismaService`, `AppConfigService`, all services | NestJS DI default scope is singleton |
| Cookie-based session auth | `SessionAuthGuard`, `ChatGateway`, `NotificationsGateway` | No JWT — sessions are stored in DB |
| `ErrorCode` string enum | `src/common/constants/error-codes.ts` | Machine-readable error codes in HTTP exceptions; avoids raw string errors |
| `TransformInterceptor` response envelope | Applied globally in `src/main.ts` | Consistent `{ statusCode, message, data }` shape for all HTTP responses |
| `@ApiCommonErrors()` decorator | All controllers | DRY Swagger documentation of 400/401/500 responses |
| `ApiOkResponseGeneric<T>` / `ApiCreatedResponseGeneric<T>` | All controllers | Typed Swagger response schemas wrapping the response envelope |
| `$transaction()` | `AuthService.register`, `WorkspaceService.acceptInvite`, `NotificationsService.markAllAsRead` | Atomic multi-write operations |
| `upsert()` for idempotent writes | `WorkspaceService.inviteMember`, `NotificationsService.createWorkspaceInviteNotification` | Re-invite or re-notify without duplicates |

### 5) Known Architectural Risks

- **Duplicate cookie-parsing logic**: `getAuthToken` + `parseCookies` is copy-pasted verbatim in both `chat.gateway.ts` and `notifications.gateway.ts`. A future gateway would need a third copy.
- **No shared WebSocket auth middleware**: Each gateway re-implements session validation directly against `PrismaService`. If session logic changes (e.g., refresh tokens), all gateways must be updated independently.
- **Session expiry is lazy**: Sessions are only deleted/checked at the moment of a request. There is no background task to purge expired sessions from the database.

### 6) Evidence

- `src/main.ts` — bootstrap and global middleware
- `src/common/guards/session.guard.ts` — HTTP auth pattern
- `src/modules/chat/chat.gateway.ts` — WebSocket auth pattern
- `src/modules/workspaces/workspace.service.ts` — cross-module orchestration
- `src/common/interceptors/transform.interceptor.ts` — response envelope
