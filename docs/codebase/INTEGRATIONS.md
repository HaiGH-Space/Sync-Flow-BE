# External Integrations

## Core Sections (Required)

### 1) Integration Inventory

| System | Type | Purpose | Auth model | Criticality | Evidence |
|--------|------|---------|------------|-------------|----------|
| PostgreSQL | Database | Primary data store for all entities | Connection string (`DATABASE_URL`) | High | `prisma/schema.prisma`, `src/database/prisma/prisma.service.ts` |
| Cloudinary | External API (CDN) | File/image upload, storage, and deletion | API Key + API Secret + Cloud Name (env vars) | Medium | `src/providers/cloudinary/cloudinary.service.ts`, `.env.example` |
| LiveKit Cloud / Server | External Service (WebRTC) | Real-time audio/video conferencing channels | API Key + API Secret (HMAC token signing) | Medium | `src/providers/livekit/livekit.service.ts`, `.env.example` |
| SMTP (any provider) | Email transport | Transactional email — email verification, workspace invites | SMTP credentials (host/port/user/pass env vars) | Medium | `src/shared/mail/mail.module.ts`, `.env.example` |
| Socket.IO | WebSocket | Real-time chat messaging and notifications | Cookie-based session token | High | `src/modules/chat/chat.gateway.ts`, `src/modules/notifications/notifications.gateway.ts` |
| Redis | In-Memory Cache | Cache session tokens and auth states | Connection string (`REDIS_URL`) | High | `src/common/redis/redis.service.ts`, `src/common/guards/session.guard.ts` |

### 2) Data Stores

| Store | Role | Access layer | Key risk | Evidence |
|-------|------|--------------|----------|----------|
| PostgreSQL (via Neon or any PG) | Primary RDBMS — all application data | `PrismaService` (singleton, injected into services) | Single DB, no read replica — all reads and writes hit same instance | `src/database/prisma/prisma.service.ts` |
| Redis | Session Token Cache | `RedisService` (singleton, using `ioredis`) | Single point of failure for fast-path auth (falls back to DB on cold cache) | `src/common/redis/redis.service.ts` |

> [!NOTE]
> Session tokens are verified as JWTs and cached in Redis. The system only falls back to PostgreSQL lookup if the cache is cold, in which case it automatically populates the Redis cache.

### 3) Secrets and Credentials Handling

- **Credential sources**: `.env` file loaded by `AppConfigModule` (`@nestjs/config` `ConfigModule.forRoot`). All secrets accessed only through `AppConfigService` getters — never via raw `process.env`.
- **Hardcoding checks**: No hardcoded credentials found in source code. Cloudinary credentials not present in source — loaded from env via `AppConfigModule` and passed to the `cloudinary.config()` call in `src/providers/cloudinary/cloudinary.provider.ts`.
- **Rotation/lifecycle**: Manual rotation is used for secrets.
- **`.env` is git-ignored** (`.gitignore` confirms); `.env.example` is committed as the template.

### 4) Reliability and Failure Behavior

- **Retry/backoff**: None observed. No retry logic for Cloudinary uploads, SMTP sends, or DB queries.
- **Timeout policy**: No explicit timeouts configured for external calls.
- **Circuit-breaker / fallback**: None detected. Cloudinary and email failures bubble up as `InternalServerErrorException`.
- **Prisma connection**: `PrismaService` creates the adapter and connection on app startup (`super({ adapter })`) — no connection pool config tuning observed.

### 5) Observability for Integrations

- **Logging around external calls**: Minimal — NestJS `Logger` class in `PrismaService` (database connection), `AuthService` (errors on registration/logout), and gateways (connection/disconnect events).
- **Metrics/tracing**: None. No APM, Prometheus, or distributed tracing detected.
- **Health check**: A `/health` check endpoint is implemented using `@nestjs/terminus` and `PrismaHealthIndicator` to verify database connectivity.
- **Missing visibility gaps**:
  - No custom JSON log formatting adopted yet (uses default NestJS Logger formatting).
  - No request ID / correlation ID propagated through the pipeline.
  - Cloudinary and email call outcomes are not logged on success.

### 6) Evidence

- `src/providers/cloudinary/cloudinary.service.ts` — Cloudinary integration
- `src/shared/mail/mail.module.ts` — SMTP/Mailer setup
- `src/database/prisma/prisma.service.ts` — PostgreSQL connection
- `src/modules/chat/chat.gateway.ts`, `src/modules/notifications/notifications.gateway.ts` — Socket.IO integration
- `.env.example` — all required credentials
