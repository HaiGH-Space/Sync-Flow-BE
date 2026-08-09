# Explicit WebSocket Token Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix WebSocket authentication failures by explicitly returning session tokens from `POST /auth/login` and `GET /users/me`, and passing `session_token` in Socket.IO handshake `auth` payloads on the frontend.

**Architecture:** The backend `SessionAuthGuard` attaches the session token string to the request context. `AuthController` (`POST /auth/login`) and `UserController` (`GET /users/me`) include `token` in their JSON response bodies. The frontend stores `token` in `useUserStore` and passes it directly to `getChatSocket(token)` and `getNotificationSocket(token)`.

**Tech Stack:** NestJS, TypeScript, Express, Socket.IO Client, Next.js 16, React, Zustand.

## Global Constraints

- Backend session token field name: `token`
- Socket.IO auth property name: `session_token`
- HttpOnly cookie `session_token` must remain intact for REST HTTP requests.

---

### Task 1: Backend Session Token Propagation in Guard and Controllers

**Files:**
- Modify: `be/src/common/guards/session.guard.ts`
- Modify: `be/src/modules/auth/auth.controller.ts`
- Modify: `be/src/modules/users/user.controller.ts`
- Test: `be/src/modules/auth/auth.service.spec.ts`

**Interfaces:**
- Consumes: `SessionAuthGuard`, `SessionTokenService`
- Produces: `POST /auth/login` returning `{ ...user, token }`, `GET /users/me` returning `{ ...user, token }`

- [ ] **Step 1: Update `SessionAuthGuard` to attach token string to `request.sessionToken`**

In `be/src/common/guards/session.guard.ts`:
```typescript
// Inside canActivate before returning true:
(request as unknown as { sessionToken?: string }).sessionToken = token;
```

- [ ] **Step 2: Update `AuthController.signIn` to return `token` in JSON response**

In `be/src/modules/auth/auth.controller.ts`:
```typescript
const session = await this.authService.login(dto, userAgent, ipAddress);
response.cookie("session_token", session.token, {
  httpOnly: true,
  secure: this.configService.isProduction,
  sameSite: "lax",
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000,
});

return {
  ...session.user,
  token: session.token,
};
```

- [ ] **Step 3: Update `UserController.getProfile` to return `token` in JSON response**

In `be/src/modules/users/user.controller.ts`:
```typescript
@Get("me")
@ApiOkResponseGeneric(UserEntity)
async getProfile(@Req() req: Request, @CurrentUser() user: User) {
  const userProfile = await this.userService.findOne(user.id);
  const token = (req as unknown as { sessionToken?: string }).sessionToken;
  return {
    ...userProfile,
    token,
  };
}
```

- [ ] **Step 4: Run backend tests to verify**

Run: `cd be && pnpm test`
Expected: PASS

- [ ] **Step 5: Commit backend changes**

```bash
git add be/src/common/guards/session.guard.ts be/src/modules/auth/auth.controller.ts be/src/modules/users/user.controller.ts
git commit -m "feat(be): return session token in login and me profile responses"
```

---

### Task 2: Frontend Store and API Types Update

**Files:**
- Modify: `fe/lib/api/user.ts`
- Modify: `fe/lib/store/use-user-profile.ts`
- Test: `fe/lib/store/use-user-profile.test.ts` (if exists or new)

**Interfaces:**
- Consumes: Backend `{ ...user, token }`
- Produces: `useUserStore` state containing `token?: string`

- [ ] **Step 1: Update `UserProfile` type in `fe/lib/api/user.ts`**

In `fe/lib/api/user.ts`:
```typescript
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  emailVerified?: boolean;
  hasSeenWelcome?: boolean;
  token?: string;
}
```

- [ ] **Step 2: Update `useUserStore` in `fe/lib/store/use-user-profile.ts`**

In `fe/lib/store/use-user-profile.ts`:
```typescript
type UserProfileActions = {
  logout: () => Promise<void>;
  setUserProfile: (profile: UserProfile) => void;
};

type UserProfileStore = {
  userProfile?: UserProfile;
  token?: string;
} & UserProfileActions;

export const useUserStore = create<UserProfileStore>((set) => ({
  logout: async () => {
    await authService.logout();
    set({ userProfile: undefined, token: undefined });
  },
  setUserProfile: (profile: UserProfile) =>
    set({ userProfile: profile, token: profile.token }),
}));
```

- [ ] **Step 3: Verify frontend type check**

Run: `cd fe && pnpm build`
Expected: PASS

- [ ] **Step 4: Commit frontend store changes**

```bash
git add fe/lib/api/user.ts fe/lib/store/use-user-profile.ts
git commit -m "feat(fe): add token to UserProfile interface and useUserStore"
```

---

### Task 3: Frontend Socket Helpers & Custom Hooks Explicit Token Integration

**Files:**
- Modify: `fe/lib/api/chat.ts`
- Modify: `fe/lib/api/notification.ts`
- Modify: `fe/hooks/chat/use-chat-channel.ts`
- Modify: `fe/hooks/notifications/use-notification-channel.ts`

**Interfaces:**
- Consumes: `token?: string` from `useUserStore`
- Produces: Socket.IO connections with `auth: { session_token: token }`

- [ ] **Step 1: Update `getChatSocket(token?: string)` in `fe/lib/api/chat.ts`**

In `fe/lib/api/chat.ts`:
```typescript
export const getChatSocket = (token?: string) => {
  const sessionToken = token || getCookieValue("session_token");
  if (chatSocket) {
    if (sessionToken && chatSocket.io.opts.auth) {
      (chatSocket.io.opts.auth as Record<string, unknown>).session_token = sessionToken;
    }
    return chatSocket;
  }

  const socketUrl = getWebSocketUrl("chat");
  chatSocket = io(socketUrl, {
    withCredentials: true,
    autoConnect: true,
    auth: sessionToken ? { session_token: sessionToken } : undefined,
  });

  return chatSocket;
};
```

- [ ] **Step 2: Update `getNotificationSocket(token?: string)` in `fe/lib/api/notification.ts`**

In `fe/lib/api/notification.ts`:
```typescript
export const getNotificationSocket = (token?: string) => {
  const sessionToken = token || getCookieValue("session_token");
  if (notificationSocket) {
    if (sessionToken && notificationSocket.io.opts.auth) {
      (notificationSocket.io.opts.auth as Record<string, unknown>).session_token = sessionToken;
    }
    return notificationSocket;
  }

  const socketUrl = getWebSocketUrl("notifications");
  notificationSocket = io(socketUrl, {
    withCredentials: true,
    autoConnect: true,
    auth: sessionToken ? { session_token: sessionToken } : undefined,
  });

  return notificationSocket;
};
```

- [ ] **Step 3: Update `useChatChannel` and `useNotificationChannel` hooks**

In `fe/hooks/chat/use-chat-channel.ts`:
```typescript
const token = useUserStore((s) => s.token);

useEffect(() => {
  const socket = getChatSocket(token);
  // ... rest of hook logic
}, [queryClient, token]);
```

In `fe/hooks/notifications/use-notification-channel.ts`:
```typescript
const token = useUserStore((s) => s.token);

useEffect(() => {
  const socket = getNotificationSocket(token);
  // ... rest of hook logic
}, [token]);
```

- [ ] **Step 4: Run validation commands**

Run: `cd fe && pnpm lint && pnpm build`
Expected: PASS with 0 lint and build errors

- [ ] **Step 5: Commit changes**

```bash
git add fe/lib/api/chat.ts fe/lib/api/notification.ts fe/hooks/chat/use-chat-channel.ts fe/hooks/notifications/use-notification-channel.ts
git commit -m "fix(fe): pass explicit session token to WebSocket socket factories and hooks"
```
