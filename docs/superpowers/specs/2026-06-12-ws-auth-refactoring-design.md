# Design Document: WebSocket Auth Code Refactoring

## 1. Context & Problem Statement
Currently, both `chat.gateway.ts` and `notifications.gateway.ts` duplicate the helper functions `getAuthToken` and `parseCookies` verbatim. This code redundancy creates a drift risk, meaning any future updates to how WebSocket authentication tokens are extracted or parsed would need to be applied in multiple places.

## 2. Proposed Solution
Extract the shared logic into a centralized utility file: `src/common/utils/ws-auth.ts`. Both gateways will import `getAuthToken` from this module, eliminating the duplicate code and ensuring a single source of truth for extracting authentication tokens from Socket.io connections.

## 3. Design Specification

### 3.1. New Utility File: `src/common/utils/ws-auth.ts`
This file will contain the helper functions:
```typescript
import { Socket } from 'socket.io';

/**
 * Helper to parse cookie string into an object of key-value pairs.
 */
export const parseCookies = (cookieString?: string): Record<string, string> => {
  if (!cookieString) return {};
  return cookieString.split(';').reduce((res, item) => {
    const data = item.trim().split('=');
    return { ...res, [data[0]]: decodeURIComponent(data[1] || '') };
  }, {});
};

/**
 * Extracts session/auth token from Socket handshake cookies or auth payload.
 */
export const getAuthToken = (client: Socket): string | undefined => {
  const cookieString = client.handshake.headers.cookie;
  if (cookieString) {
    const cookies = parseCookies(cookieString);
    if (cookies['session_token']) {
      return cookies['session_token'];
    }
  }

  const authPayload = client.handshake.auth;
  if (typeof authPayload?.session_token === 'string') {
    return authPayload.session_token;
  }
  if (typeof authPayload?.token === 'string') {
    return authPayload.token;
  }

  return undefined;
};
```

### 3.2. Refactoring `src/modules/chat/chat.gateway.ts`
* Remove local implementation of `getAuthToken` and `parseCookies`.
* Import `getAuthToken` from `src/common/utils/ws-auth`.

### 3.3. Refactoring `src/modules/notifications/notifications.gateway.ts`
* Remove local implementation of `getAuthToken` and `parseCookies`.
* Import `getAuthToken` from `src/common/utils/ws-auth`.

## 4. Verification Plan
* Run `pnpm build` (or `pnpm.cmd build` on Windows) to verify compilation.
* Run tests to ensure no regressions have been introduced.
