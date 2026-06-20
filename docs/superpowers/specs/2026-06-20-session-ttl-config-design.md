# Design Spec: Session TTL Configuration

## 1. Goal
Make the session Time-To-Live (TTL) configurable via an environment variable. Currently, the session TTL is hardcoded to 7 days in `AuthService`. We will expose it as `SESSION_TTL_DAYS` via `AppConfigService`, falling back to `7` days if not set.

## 2. Changes

### Config Service (`src/config/config.service.ts`)
- Add a new getter `sessionTtlDays` that retrieves the `SESSION_TTL_DAYS` environment variable.
- Fallback to `7` if the variable is not set.
- Implement this using the existing `getNumber` utility.

### Auth Service (`src/modules/auth/auth.service.ts`)
- Update `createSession` method to use the configured value:
  ```typescript
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + this.configService.sessionTtlDays);
  ```

### Environment Templates (`.env.example` & `.env`)
- Append `SESSION_TTL_DAYS=7` to `.env.example`.
- Append `SESSION_TTL_DAYS=7` to `.env` for local development.

### Auth Service Unit Tests (`src/modules/auth/auth.service.spec.ts`)
- Mock the new `sessionTtlDays` getter in `mockConfigService` or when testing to ensure the correct expiration logic is followed.
- Verify the token creation uses the configured number of days.

## 3. Success Criteria
1. The project compiles successfully.
2. All unit tests pass.
3. Verify that changing `SESSION_TTL_DAYS` alters the calculated expiration time.
