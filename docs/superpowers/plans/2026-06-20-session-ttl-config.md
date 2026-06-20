# Session TTL Configuration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the session TTL configurable via environment variables in `AppConfigService` and `AuthService`.

**Architecture:** Add a new configurable property `sessionTtlDays` inside `AppConfigService` parsed from `SESSION_TTL_DAYS`. Update `AuthService` to calculate `expiresAt` based on this value instead of the hardcoded `7` days.

**Tech Stack:** NestJS, TypeScript, Jest, Prisma.

---

### Task 1: Environment Variable Configurations

**Files:**
- Modify: `d:\Dev\JS\sync-flow\be\.env.example`
- Modify: `d:\Dev\JS\sync-flow\be\.env`

- [ ] **Step 1: Add config variable to .env.example**
  Add the environment variable template.
  Target Content:
  ```properties
  # Session cleanup cron expression (default: every 2 hours)
  SESSION_CLEANUP_CRON=0 */2 * * *
  ```
  Replacement Content:
  ```properties
  # Session cleanup cron expression (default: every 2 hours)
  SESSION_CLEANUP_CRON=0 */2 * * *

  # Session Time-To-Live in days
  SESSION_TTL_DAYS=7
  ```

- [ ] **Step 2: Add config variable to .env**
  Add the environment variable to `.env` for local development.
  Target Content:
  ```properties
  # Session cleanup cron expression (default: every 2 hours)
  SESSION_CLEANUP_CRON=0 */2 * * *
  ```
  Replacement Content:
  ```properties
  # Session cleanup cron expression (default: every 2 hours)
  SESSION_CLEANUP_CRON=0 */2 * * *

  # Session Time-To-Live in days
  SESSION_TTL_DAYS=7
  ```

- [ ] **Step 3: Commit**
  Run:
  ```bash
  git add .env .env.example
  git commit -m "config: add SESSION_TTL_DAYS variable to env files"
  ```

---

### Task 2: Update AppConfigService

**Files:**
- Modify: `d:\Dev\JS\sync-flow\be\src\config\config.service.ts`

- [ ] **Step 1: Implement sessionTtlDays getter**
  Add a new getter to `AppConfigService` in `src/config/config.service.ts`.
  Target Content:
  ```typescript
    get defaultInviteExpiresInDays() {
      return this.getNumber("DEFAULT_INVITE_EXPIRES_IN_DAYS", 7);
    }
  ```
  Replacement Content:
  ```typescript
    get defaultInviteExpiresInDays() {
      return this.getNumber("DEFAULT_INVITE_EXPIRES_IN_DAYS", 7);
    }

    get sessionTtlDays() {
      return this.getNumber("SESSION_TTL_DAYS", 7);
    }
  ```

- [ ] **Step 2: Verify compilation**
  Run: `pnpm.cmd build`
  Expected: Successful compilation without error.

- [ ] **Step 3: Commit**
  Run:
  ```bash
  git add src/config/config.service.ts
  git commit -m "feat: add sessionTtlDays getter to AppConfigService"
  ```

---

### Task 3: Update AuthService and Tests

**Files:**
- Modify: `d:\Dev\JS\sync-flow\be\src\modules\auth\auth.service.ts`
- Modify: `d:\Dev\JS\sync-flow\be\src\modules\auth\auth.service.spec.ts`

- [ ] **Step 1: Update createSession in AuthService**
  Change the hardcoded 7 to use `this.configService.sessionTtlDays`.
  Target Content:
  ```typescript
      // Set expiration date for 7 days
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
  ```
  Replacement Content:
  ```typescript
      // Set expiration date using configured TTL
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + this.configService.sessionTtlDays);
  ```

- [ ] **Step 2: Add sessionTtlDays mock to tests**
  Update `mockConfigService` inside `src/modules/auth/auth.service.spec.ts` to return `7`.
  Target Content:
  ```typescript
    const mockConfigService = {
      frontendUrl: "http://localhost:3000",
    };
  ```
  Replacement Content:
  ```typescript
    const mockConfigService = {
      frontendUrl: "http://localhost:3000",
      sessionTtlDays: 7,
    };
  ```

- [ ] **Step 3: Run the tests**
  Run: `pnpm.cmd test src/modules/auth/auth.service.spec.ts`
  Expected: PASS

- [ ] **Step 4: Commit**
  Run:
  ```bash
  git add src/modules/auth/auth.service.ts src/modules/auth/auth.service.spec.ts
  git commit -m "feat: expose and use configurable session ttl in AuthService"
  ```
