# Design Spec: Explicit WebSocket Token Authentication

Date: 2026-08-07  
Status: Approved  

---

## 1. Executive Summary & Goal

Resolve WebSocket connection authentication failures (`AUTH_UNAUTHORIZED` on `ChatGateway` and `NotificationsGateway`) by passing session tokens explicitly in Socket.IO `auth` payloads instead of relying solely on `HttpOnly` cross-origin browser cookies.

---

## 2. Problem Statement & Root Cause

1. **`HttpOnly` Cookie Restriction:** Backend sets `session_token` cookie as `HttpOnly: true`. Frontend JavaScript cannot read `HttpOnly` cookies via `document.cookie`. Consequently, client socket factory calls to `getCookieValue("session_token")` return `undefined`, passing `auth: undefined` to Socket.IO.
2. **Domain / Host Mismatch:** Frontend HTTP requests hit `localhost:3000` via Next.js proxy, storing the `session_token` cookie under domain `localhost`. Direct WebSocket connections to `http://127.0.0.1:8000` do not receive `localhost` cookies due to origin isolation.
3. **Gateway Auth Rejection:** `ws-auth.ts` fails to find tokens in either handshake headers or handshake `auth` payloads, causing `NotificationsGateway` and `ChatGateway` connection attempts to fail with `AUTH_UNAUTHORIZED`.

---

## 3. System Architecture & Component Changes

### 3.1 Backend (`be`)

#### `SessionAuthGuard` (`be/src/common/guards/session.guard.ts`)
- Attach the parsed session token string to the Express request object (`request.sessionToken = token`) during authentication.

#### `AuthController` (`be/src/modules/auth/auth.controller.ts`)
- Update `signIn` endpoint (`POST /auth/login`) response to return `{ user: session.user, token: session.token }`.
- Continue writing the `HttpOnly` `session_token` cookie for standard HTTP requests.

#### `UserController` (`be/src/modules/users/user.controller.ts`)
- Update `getProfile` endpoint (`GET /users/me`) to return `{ ...user, token: request.sessionToken }`.
- Guarantees token availability to client upon page refresh/rehydration.

#### `WebSocket Gateways` (`be/src/modules/chat/chat.gateway.ts` & `be/src/modules/notifications/notifications.gateway.ts`)
- Leverage existing `getAuthToken(client)` in `src/common/utils/ws-auth.ts` which already inspects `client.handshake.auth['session_token']` and `client.handshake.auth['token']`.

---

### 3.2 Frontend (`fe`)

#### User Profile Store (`fe/lib/store/use-user-profile.ts`)
- Add `token?: string` property and setter to `useUserStore`.
- Update store when logging in or when fetching `/users/me`.

#### API Services & Types (`fe/lib/api/auth.ts` & `fe/lib/api/user.ts`)
- Update `login` response type to include `token: string`.
- Update `UserProfile` or profile fetcher response to include `token?: string`.

#### Socket Factory Helpers (`fe/lib/api/chat.ts` & `fe/lib/api/notification.ts`)
- Modify `getChatSocket(token?: string)` and `getNotificationSocket(token?: string)` signatures.
- When `token` is provided, initialize Socket.IO with `auth: { session_token: token }`.
- If called with a new `token` while connected, update socket auth credentials and reconnect if required.

#### Custom Hooks (`fe/hooks/chat/use-chat-channel.ts` & `fe/hooks/notifications/use-notification-channel.ts`)
- Retrieve `token` from `useUserStore((s) => s.token)` and pass it into `getChatSocket(token)` and `getNotificationSocket(token)`.

---

## 4. End-to-End Data Flow

### 4.1 Login Flow
1. User submits login form (`POST /auth/login`).
2. Backend responds with `{ user: {...}, token: "c7f..." }` and sets `HttpOnly` `session_token` cookie.
3. Frontend updates `useUserStore` with `userProfile` and `token`.
4. Socket hooks (`useChatChannel`, `useNotificationChannel`) receive the new `token` from store.
5. Socket factories connect to `ws://...` passing `auth: { session_token: token }`.
6. Gateways authenticate `auth.session_token` and complete handshake successfully.

### 4.2 Rehydration Flow (F5 Page Refresh)
1. User refreshes page; in-memory JS state clears.
2. App mounts and issues HTTP request `GET /users/me` using automatic browser `HttpOnly` cookie.
3. Backend returns `{ ...user, token: "c7f..." }`.
4. Frontend populates `useUserStore` with profile and `token`.
5. Socket hooks pass `token` to `getChatSocket(token)` and `getNotificationSocket(token)`.
6. WebSocket handshakes succeed.

---

## 5. Verification & Testing Strategy

1. **Backend Integration Tests:**
   - Verify `POST /auth/login` returns `token` in JSON body.
   - Verify `GET /users/me` returns `token` in JSON body.
   - Verify `ChatGateway` and `NotificationsGateway` accept connection when `handshake.auth.session_token` is provided.

2. **Frontend E2E / Runtime Verification:**
   - Log into frontend application and inspect Socket.IO connection status.
   - Verify zero `AUTH_UNAUTHORIZED` errors in backend terminal logs.
   - Refresh page (F5) and verify sockets re-establish connections cleanly.
