# Logout (Per-Device) Design

## Overview

Add a per-device logout endpoint that invalidates the current session by deleting its database record and clearing the `session_token` cookie.

## Goals

- Provide `POST /auth/logout` to invalidate the current session.
- Clear the `session_token` cookie on logout.
- Keep the change minimal and consistent with existing auth patterns.

## Non-Goals

- Global logout (revoking all sessions for a user).
- Session management UI or additional session metadata.

## API Design

- **Endpoint:** `POST /auth/logout`
- **Guards:** `SessionAuthGuard`
- **Request:** no body
- **Response:** a small success payload (message or boolean), consistent with existing response conventions.

## Data Flow

1. Client calls `POST /auth/logout` with `session_token` cookie.
2. `SessionAuthGuard` validates the session token and user.
3. Controller or service deletes the session record for that token.
4. Controller clears the `session_token` cookie.
5. Response returns success.

## Error Handling

- If no valid session cookie exists, the guard returns `AUTH_UNAUTHORIZED` or session-expired errors (existing behavior).
- If the session record does not exist or expired, the guard handles it; logout returns standard auth error response.

## Testing Notes

- Unit test: logout deletes session record and clears cookie when a valid session exists.
- Guard behavior: invalid or expired session returns existing auth errors.

## Implementation Notes

- Add logout route to `AuthController` and a small `AuthService` method to delete the session by token.
- Keep the existing cookie options consistent with login; use `response.clearCookie` with the same name and path.
