# WebSocket Auth Code Refactoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the duplicate WebSocket authentication code (`getAuthToken` and `parseCookies`) from `chat.gateway.ts` and `notifications.gateway.ts` into a centralized utility helper.

**Architecture:** Create a common utility file `src/common/utils/ws-auth.ts` containing the parsing and extraction functions. Unit test the helpers to guarantee correctness and then refactor the two gateways to import them.

**Tech Stack:** NestJS, TypeScript, Socket.io, Jest

---

### Task 1: Create WebSocket Auth Utility and Tests

**Files:**
- Create: `src/common/utils/ws-auth.ts`
- Create: `src/common/utils/ws-auth.spec.ts`

- [ ] **Step 1: Write a failing unit test in `src/common/utils/ws-auth.spec.ts`**
  ```typescript
  import { parseCookies, getAuthToken } from './ws-auth';

  describe('ws-auth utility', () => {
    describe('parseCookies', () => {
      it('should parse cookie strings correctly', () => {
        expect(parseCookies('session_token=123; foo=bar')).toEqual({
          session_token: '123',
          foo: 'bar',
        });
      });

      it('should return empty object for empty/undefined cookie string', () => {
        expect(parseCookies(undefined)).toEqual({});
        expect(parseCookies('')).toEqual({});
      });
    });

    describe('getAuthToken', () => {
      it('should extract session token from cookies if present', () => {
        const mockClient = {
          handshake: {
            headers: {
              cookie: 'session_token=test-cookie-token; other=val',
            },
            auth: {},
          },
        } as any;
        expect(getAuthToken(mockClient)).toBe('test-cookie-token');
      });

      it('should extract session token from auth payload if not in cookies', () => {
        const mockClient = {
          handshake: {
            headers: {},
            auth: {
              session_token: 'test-auth-token',
            },
          },
        } as any;
        expect(getAuthToken(mockClient)).toBe('test-auth-token');
      });

      it('should extract token from auth payload token property if session_token is not present', () => {
        const mockClient = {
          handshake: {
            headers: {},
            auth: {
              token: 'test-token-prop',
            },
          },
        } as any;
        expect(getAuthToken(mockClient)).toBe('test-token-prop');
      });

      it('should return undefined if no token is found', () => {
        const mockClient = {
          handshake: {
            headers: {},
            auth: {},
          },
        } as any;
        expect(getAuthToken(mockClient)).toBeUndefined();
      });
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**
  Run: `pnpm.cmd test`
  Expected: FAIL/Error (module `ws-auth` not found or functions not defined)

- [ ] **Step 3: Write implementation in `src/common/utils/ws-auth.ts`**
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
  export const getAuthToken = (client: Socket | any): string | undefined => {
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

- [ ] **Step 4: Run test to verify it passes**
  Run: `pnpm.cmd test`
  Expected: PASS

- [ ] **Step 5: Commit changes**
  ```bash
  git add src/common/utils/ws-auth.ts src/common/utils/ws-auth.spec.ts
  git commit -m "feat(ws-auth): extract common websocket authentication utility and add unit tests"
  ```

---

### Task 2: Refactor Chat Gateway

**Files:**
- Modify: `src/modules/chat/chat.gateway.ts`

- [ ] **Step 1: Refactor `chat.gateway.ts` to use extracted utility**
  Replace local definition of `getAuthToken` and `parseCookies` with imports.
  
  Imports change:
  ```typescript
  import { getAuthToken } from 'src/common/utils/ws-auth';
  ```
  At the bottom of `chat.gateway.ts`, remove:
  ```typescript
  const getAuthToken = (client: AuthenticatedSocket): string | undefined => { ... }
  const parseCookies = (cookieString?: string): Record<string, string> => { ... }
  ```

- [ ] **Step 2: Verify compiling and tests pass**
  Run: `pnpm.cmd build`
  Run: `pnpm.cmd test`
  Expected: Success

- [ ] **Step 3: Commit changes**
  ```bash
  git add src/modules/chat/chat.gateway.ts
  git commit -m "refactor(chat): replace duplicate websocket auth helpers with common utility"
  ```

---

### Task 3: Refactor Notifications Gateway

**Files:**
- Modify: `src/modules/notifications/notifications.gateway.ts`

- [ ] **Step 1: Refactor `notifications.gateway.ts` to use extracted utility**
  Replace local definition of `getAuthToken` and `parseCookies` with imports.
  
  Imports change:
  ```typescript
  import { getAuthToken } from 'src/common/utils/ws-auth';
  ```
  At the bottom of `notifications.gateway.ts`, remove:
  ```typescript
  const getAuthToken = (client: AuthenticatedSocket): string | undefined => { ... }
  const parseCookies = (cookieString?: string): Record<string, string> => { ... }
  ```

- [ ] **Step 2: Verify compiling and tests pass**
  Run: `pnpm.cmd build`
  Run: `pnpm.cmd test`
  Expected: Success

- [ ] **Step 3: Commit changes**
  ```bash
  git add src/modules/notifications/notifications.gateway.ts
  git commit -m "refactor(notifications): replace duplicate websocket auth helpers with common utility"
  ```
