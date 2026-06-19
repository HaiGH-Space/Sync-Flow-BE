# Service-Level Unit Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Increase the unit test coverage of critical modules (`AuthService`, `WorkspaceService`, `NotificationsService`) to protect against regressions, focusing on edge cases, validation logic, transaction rollbacks, and security checks.

**Architecture:** We will use the NestJS Test runner with `@nestjs/testing` and fully mock the database client (`PrismaService`) and external services (`MailerService`, `AppConfigService`, `NotificationsGateway`, `NotificationsGateway`). This allows testing business logic, edge cases, and transaction flow in isolation.

**Tech Stack:** NestJS Testing, Jest, ts-jest, Prisma, TypeScript.

---

### Task 1: Extend AuthService Registration Tests

**Files:**
- Modify: `src/modules/auth/auth.service.spec.ts`

- [ ] **Step 1: Add new test cases to registration describe block**
  Add the following tests for duplicate email conflict and transaction database error handling inside the existing `AuthService` test suite in `src/modules/auth/auth.service.spec.ts`:

```typescript
  it("should throw ConflictException if the email is already in use", async () => {
    mockPrismaService.user.findUnique.mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
    });

    await expect(
      service.register({
        email: "test@example.com",
        password: "password123",
        name: "Test User",
      })
    ).rejects.toThrow(
      new ConflictException(ErrorCode.AUTH_EMAIL_IN_USE)
    );

    expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
      where: { email: "test@example.com" },
    });
  });

  it("should rollback and throw InternalServerErrorException if verification creation fails inside transaction", async () => {
    mockPrismaService.user.findUnique.mockResolvedValue(null);
    mockPrismaService.$transaction.mockImplementation(
      async (callback: (tx: any) => Promise<any>) => {
        return await callback(mockPrismaService);
      }
    );
    mockPrismaService.user.create = jest.fn().mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      name: "Test User",
    });
    mockPrismaService.verification.create = jest.fn().mockRejectedValue(new Error("Verification failed"));

    await expect(
      service.register({
        email: "test@example.com",
        password: "password123",
        name: "Test User",
      })
    ).rejects.toThrow(
      new InternalServerErrorException(ErrorCode.INTERNAL_SERVER_ERROR)
    );

    expect(loggerErrorSpy).toHaveBeenCalledWith(
      "Register Error:",
      expect.stringContaining("Verification failed")
    );
  });
```

- [ ] **Step 2: Run test suite to verify tests pass**
  Run: `pnpm.cmd test src/modules/auth/auth.service.spec.ts`
  Expected: PASS

- [ ] **Step 3: Commit**
  Run:
  ```bash
  git add src/modules/auth/auth.service.spec.ts
  git commit -m "test(auth): add conflict and rollback edge cases for registration"
  ```

---

### Task 2: Extend AuthService Login Tests

**Files:**
- Modify: `src/modules/auth/auth.service.spec.ts`

- [ ] **Step 1: Add new test block for login**
  Add the following `describe("login", ...)` block containing test cases for missing user, OAuth-only account, invalid password, and happy path login with session creation to `src/modules/auth/auth.service.spec.ts`:

```typescript
  describe("login", () => {
    const mockSession = {
      id: "session-123",
      token: "session-token-abc",
      expiresAt: new Date(),
      userId: "user-123",
      user: {
        id: "user-123",
        name: "Test User",
        email: "test@example.com",
        image: null,
        emailVerified: true,
        hasSeenWelcome: false,
      },
    };

    beforeEach(() => {
      mockPrismaService.user.findUnique = jest.fn();
      mockPrismaService.account = {
        findFirst: jest.fn(),
        create: jest.fn(),
      };
      mockPrismaService.session = {
        create: jest.fn(),
        deleteMany: jest.fn(),
      };
    });

    it("should throw UnauthorizedException if user is not found", async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: "notfound@example.com", password: "password123" })
      ).rejects.toThrow(
        new UnauthorizedException(ErrorCode.AUTH_INVALID_CREDENTIALS)
      );
    });

    it("should throw UnauthorizedException if account is OAuth only (no password or account empty)", async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: "user-123", email: "oauth@example.com" });
      mockPrismaService.account.findFirst.mockResolvedValue(null);

      await expect(
        service.login({ email: "oauth@example.com", password: "password123" })
      ).rejects.toThrow(
        new UnauthorizedException(ErrorCode.AUTH_OAUTH_ACCOUNT_ONLY)
      );
    });

    it("should throw UnauthorizedException if password comparison fails", async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: "user-123", email: "test@example.com" });
      mockPrismaService.account.findFirst.mockResolvedValue({ userId: "user-123", password: "hashed_password" });
      jest.spyOn(bcrypt, "compare").mockImplementation(() => Promise.resolve(false));

      await expect(
        service.login({ email: "test@example.com", password: "wrongpassword" })
      ).rejects.toThrow(
        new UnauthorizedException(ErrorCode.AUTH_INVALID_CREDENTIALS)
      );
    });

    it("should return session and user info on login success", async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: "user-123", email: "test@example.com" });
      mockPrismaService.account.findFirst.mockResolvedValue({ userId: "user-123", password: "hashed_password" });
      jest.spyOn(bcrypt, "compare").mockImplementation(() => Promise.resolve(true));
      mockPrismaService.session.create.mockResolvedValue(mockSession);

      const result = await service.login(
        { email: "test@example.com", password: "password123" },
        "Chrome",
        "127.0.0.1"
      );

      expect(result).toEqual(mockSession);
      expect(mockPrismaService.session.create).toHaveBeenCalledWith({
        data: {
          userId: "user-123",
          token: expect.any(String),
          expiresAt: expect.any(Date),
          userAgent: "Chrome",
          ipAddress: "127.0.0.1",
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              emailVerified: true,
              hasSeenWelcome: true,
            },
          },
        },
      });
    });
  });
```

- [ ] **Step 2: Run test suite to verify tests pass**
  Run: `pnpm.cmd test src/modules/auth/auth.service.spec.ts`
  Expected: PASS

- [ ] **Step 3: Commit**
  Run:
  ```bash
  git add src/modules/auth/auth.service.spec.ts
  git commit -m "test(auth): add login edge cases and happy path"
  ```

---

### Task 3: Extend AuthService LogoutByToken Tests

**Files:**
- Modify: `src/modules/auth/auth.service.spec.ts`

- [ ] **Step 1: Add new test case to logout describe block**
  Add a test verifying early return when token is missing:

```typescript
  describe("logoutByToken", () => {
    it("should return early and not call prisma if token is undefined or empty", async () => {
      mockPrismaService.session.deleteMany = jest.fn();
      await service.logoutByToken(undefined);
      expect(mockPrismaService.session.deleteMany).not.toHaveBeenCalled();
    });
  });
```

- [ ] **Step 2: Run test suite to verify tests pass**
  Run: `pnpm.cmd test src/modules/auth/auth.service.spec.ts`
  Expected: PASS

- [ ] **Step 3: Commit**
  Run:
  ```bash
  git add src/modules/auth/auth.service.spec.ts
  git commit -m "test(auth): add logout token checking edge case"
  ```

---

### Task 4: Write WorkspaceService InviteMember Tests

**Files:**
- Create: `src/modules/workspaces/workspace.service.spec.ts`

- [ ] **Step 1: Scaffold workspace.service.spec.ts with inviteMember tests**
  Create the test file and implement mock workspace tests:

```typescript
import { Test, TestingModule } from "@nestjs/testing";
import { WorkspaceService } from "./workspace.service";
import { PrismaService } from "src/database/prisma/prisma.service";
import { NotificationsService } from "src/modules/notifications/notifications.service";
import { AppConfigService } from "src/config/config.service";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { ErrorCode } from "src/common/constants/error-codes";
import { Role } from "generated/prisma/enums";

describe("WorkspaceService", () => {
  let service: WorkspaceService;

  const mockPrismaService = {
    workspaceMember: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    workspaceInvite: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
    },
    workspace: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockNotificationsService = {
    createWorkspaceInviteNotification: jest.fn().mockResolvedValue({ id: "notif-123" }),
    markWorkspaceInviteNotificationsAsRead: jest.fn().mockResolvedValue([]),
  };

  const mockConfigService = {
    defaultInviteExpiresInDays: 7,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspaceService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: AppConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<WorkspaceService>(WorkspaceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("inviteMember", () => {
    it("should throw ConflictException if the user is already a workspace member", async () => {
      mockPrismaService.workspaceMember.findFirst.mockResolvedValue({ id: "member-123" });

      await expect(
        service.inviteMember("inviter-1", "workspace-1", "member@example.com")
      ).rejects.toThrow(
        new ConflictException(ErrorCode.USER_ALREADY_MEMBER)
      );

      expect(mockPrismaService.workspaceMember.findFirst).toHaveBeenCalledWith({
        where: {
          workspaceId: "workspace-1",
          user: { email: "member@example.com" },
        },
      });
    });

    it("should upsert workspace invite and trigger notification on success", async () => {
      mockPrismaService.workspaceMember.findFirst.mockResolvedValue(null);
      mockPrismaService.workspaceInvite.upsert.mockResolvedValue({
        id: "invite-123",
        workspaceId: "workspace-1",
        email: "member@example.com",
        token: "random_token",
        expiresAt: new Date(),
        role: "MEMBER",
        inviterId: "inviter-1",
      });

      const result = await service.inviteMember(
        "inviter-1",
        "workspace-1",
        "member@example.com",
        Role.MEMBER
      );

      expect(result).toEqual({ status: true });
      expect(mockPrismaService.workspaceInvite.upsert).toHaveBeenCalledWith({
        where: {
          workspaceId_email: {
            workspaceId: "workspace-1",
            email: "member@example.com",
          },
        },
        update: {
          token: expect.any(String),
          expiresAt: expect.any(Date),
          role: "MEMBER",
          inviterId: "inviter-1",
        },
        create: {
          workspaceId: "workspace-1",
          email: "member@example.com",
          token: expect.any(String),
          expiresAt: expect.any(Date),
          role: "MEMBER",
          inviterId: "inviter-1",
        },
      });
      expect(mockNotificationsService.createWorkspaceInviteNotification).toHaveBeenCalledWith("invite-123");
    });
  });
});
```

- [ ] **Step 2: Run test suite to verify tests pass**
  Run: `pnpm.cmd test src/modules/workspaces/workspace.service.spec.ts`
  Expected: PASS

- [ ] **Step 3: Commit**
  Run:
  ```bash
  git add src/modules/workspaces/workspace.service.spec.ts
  git commit -m "test(workspace): implement inviteMember tests"
  ```

---

### Task 5: Write WorkspaceService AcceptInvite Tests

**Files:**
- Modify: `src/modules/workspaces/workspace.service.spec.ts`

- [ ] **Step 1: Add acceptInvite tests including transaction rollback**
  Add the `acceptInvite` tests to `workspace.service.spec.ts`:

```typescript
  describe("acceptInvite", () => {
    it("should throw NotFoundException if invite token is invalid", async () => {
      mockPrismaService.workspaceInvite.findUnique.mockResolvedValue(null);

      await expect(
        service.acceptInvite("user-123", "invalid-token")
      ).rejects.toThrow(
        new NotFoundException(ErrorCode.INVALID_INVITE)
      );
    });

    it("should throw NotFoundException if invite token is expired", async () => {
      const pastDate = new Date();
      pastDate.setMinutes(pastDate.getMinutes() - 10);
      mockPrismaService.workspaceInvite.findUnique.mockResolvedValue({
        token: "expired-token",
        expiresAt: pastDate,
      });

      await expect(
        service.acceptInvite("user-123", "expired-token")
      ).rejects.toThrow(
        new NotFoundException(ErrorCode.EXPIRED_INVITE)
      );
    });

    it("should rollback transaction and throw error if deleting the invite fails", async () => {
      const futureDate = new Date();
      futureDate.setMinutes(futureDate.getMinutes() + 10);
      mockPrismaService.workspaceInvite.findUnique.mockResolvedValue({
        workspaceId: "workspace-1",
        role: Role.MEMBER,
        token: "token-abc",
        expiresAt: futureDate,
      });

      mockPrismaService.$transaction.mockImplementation(
        async (callback: (tx: any) => Promise<any>) => {
          return await callback(mockPrismaService);
        }
      );

      mockPrismaService.workspaceMember.create.mockResolvedValue({ id: "member-123" });
      mockPrismaService.workspaceInvite.delete.mockRejectedValue(new Error("Delete invite failed"));

      await expect(
        service.acceptInvite("user-123", "token-abc")
      ).rejects.toThrow("Delete invite failed");

      expect(mockPrismaService.workspaceMember.create).toHaveBeenCalled();
    });

    it("should create workspace member, delete invite, mark notification as read on success", async () => {
      const futureDate = new Date();
      futureDate.setMinutes(futureDate.getMinutes() + 10);
      const mockInvite = {
        id: "invite-123",
        workspaceId: "workspace-1",
        role: Role.MEMBER,
        token: "token-abc",
        expiresAt: futureDate,
      };
      mockPrismaService.workspaceInvite.findUnique.mockResolvedValue(mockInvite);

      mockPrismaService.$transaction.mockImplementation(
        async (callback: (tx: any) => Promise<any>) => {
          return await callback(mockPrismaService);
        }
      );

      mockPrismaService.workspaceMember.create.mockResolvedValue({ id: "member-123" });
      mockPrismaService.workspaceInvite.delete.mockResolvedValue(mockInvite);

      const result = await service.acceptInvite("user-123", "token-abc");

      expect(result).toEqual({ status: true });
      expect(mockPrismaService.workspaceMember.create).toHaveBeenCalledWith({
        data: {
          workspaceId: "workspace-1",
          userId: "user-123",
          role: Role.MEMBER,
        },
      });
      expect(mockPrismaService.workspaceInvite.delete).toHaveBeenCalledWith({
        where: { token: "token-abc" },
      });
      expect(mockNotificationsService.markWorkspaceInviteNotificationsAsRead).toHaveBeenCalledWith("invite-123");
    });
  });
```

- [ ] **Step 2: Run test suite to verify tests pass**
  Run: `pnpm.cmd test src/modules/workspaces/workspace.service.spec.ts`
  Expected: PASS

- [ ] **Step 3: Commit**
  Run:
  ```bash
  git add src/modules/workspaces/workspace.service.spec.ts
  git commit -m "test(workspace): implement acceptInvite tests and transaction rollback"
  ```

---

### Task 6: Write WorkspaceService CRUD Tests

**Files:**
- Modify: `src/modules/workspaces/workspace.service.spec.ts`

- [ ] **Step 1: Add CRUD and findAllByUserId tests**
  Add the remaining tests to `workspace.service.spec.ts`:

```typescript
  describe("findAllByUserId", () => {
    it("should return workspaces where user is a member", async () => {
      const mockWorkspaces = [{ id: "ws-1", name: "Workspace 1" }];
      mockPrismaService.workspace.findMany.mockResolvedValue(mockWorkspaces);

      const result = await service.findAllByUserId("user-123");

      expect(result).toEqual(mockWorkspaces);
      expect(mockPrismaService.workspace.findMany).toHaveBeenCalledWith({
        where: {
          members: {
            some: { userId: "user-123" },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    });
  });

  describe("create", () => {
    it("should throw ConflictException if workspace url slug already exists", async () => {
      mockPrismaService.workspace.findUnique.mockResolvedValue({ id: "ws-1" });

      await expect(
        service.create("user-123", { name: "New Ws", urlSlug: "duplicate-slug" })
      ).rejects.toThrow(
        new ConflictException(ErrorCode.WORKSPACE_SLUG_EXISTS)
      );
    });

    it("should create workspace and admin membership on success", async () => {
      mockPrismaService.workspace.findUnique.mockResolvedValue(null);
      const mockCreatedWorkspace = { id: "ws-1", name: "New Ws", urlSlug: "new-ws" };
      mockPrismaService.workspace.create.mockResolvedValue(mockCreatedWorkspace);

      const result = await service.create("user-123", { name: "New Ws", urlSlug: "new-ws" });

      expect(result).toEqual(mockCreatedWorkspace);
      expect(mockPrismaService.workspace.create).toHaveBeenCalledWith({
        data: {
          name: "New Ws",
          urlSlug: "new-ws",
          ownerId: "user-123",
          members: {
            create: {
              userId: "user-123",
              role: Role.ADMIN,
            },
          },
        },
        include: { members: true },
      });
    });
  });

  describe("update", () => {
    it("should throw ConflictException if update slug belongs to another workspace", async () => {
      mockPrismaService.workspace.findUnique.mockResolvedValue({ id: "ws-other", urlSlug: "taken-slug" });

      await expect(
        service.update("ws-1", { urlSlug: "taken-slug" })
      ).rejects.toThrow(
        new ConflictException(ErrorCode.WORKSPACE_SLUG_EXISTS)
      );
    });

    it("should update workspace if slug does not conflict", async () => {
      mockPrismaService.workspace.findUnique.mockResolvedValue(null);
      const mockUpdated = { id: "ws-1", name: "Updated Ws" };
      mockPrismaService.workspace.update.mockResolvedValue(mockUpdated);

      const result = await service.update("ws-1", { name: "Updated Ws" });

      expect(result).toEqual(mockUpdated);
      expect(mockPrismaService.workspace.update).toHaveBeenCalledWith({
        where: { id: "ws-1" },
        data: { name: "Updated Ws" },
      });
    });
  });

  describe("delete", () => {
    it("should call delete workspace", async () => {
      mockPrismaService.workspace.delete.mockResolvedValue({ id: "ws-1" });

      await service.delete("ws-1");

      expect(mockPrismaService.workspace.delete).toHaveBeenCalledWith({
        where: { id: "ws-1" },
      });
    });
  });
```

- [ ] **Step 2: Run test suite to verify tests pass**
  Run: `pnpm.cmd test src/modules/workspaces/workspace.service.spec.ts`
  Expected: PASS

- [ ] **Step 3: Commit**
  Run:
  ```bash
  git add src/modules/workspaces/workspace.service.spec.ts
  git commit -m "test(workspace): add find, create, update, and delete tests"
  ```

---

### Task 7: Write NotificationsService Read-Status Tests

**Files:**
- Create: `src/modules/notifications/notifications.service.spec.ts`

- [ ] **Step 1: Scaffold notifications.service.spec.ts with read status and security check**
  Create the notifications spec and implement these tests:

```typescript
import { Test, TestingModule } from "@nestjs/testing";
import { NotificationsService } from "./notifications.service";
import { PrismaService } from "src/database/prisma/prisma.service";
import { NotificationsGateway } from "./notifications.gateway";
import { NotFoundException } from "@nestjs/common";
import { NotificationType } from "generated/prisma/client";
import { notificationSelect } from "./types/notification.types";

describe("NotificationsService", () => {
  let service: NotificationsService;

  const mockPrismaService = {
    notification: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    workspaceInvite: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockNotificationsGateway = {
    emitNotificationUpdated: jest.fn(),
    emitNotificationCreated: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: NotificationsGateway, useValue: mockNotificationsGateway },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("findAllByUserId", () => {
    it("should query findMany with pagination parameters if provided", async () => {
      mockPrismaService.notification.findMany.mockResolvedValue([]);

      await service.findAllByUserId("user-123", 2, 10);

      expect(mockPrismaService.notification.findMany).toHaveBeenCalledWith({
        where: { userId: "user-123" },
        orderBy: { createdAt: "desc" },
        skip: 10,
        take: 10,
        select: notificationSelect,
      });
    });

    it("should query findMany without pagination parameters if not provided", async () => {
      mockPrismaService.notification.findMany.mockResolvedValue([]);

      await service.findAllByUserId("user-123");

      expect(mockPrismaService.notification.findMany).toHaveBeenCalledWith({
        where: { userId: "user-123" },
        orderBy: { createdAt: "desc" },
        select: notificationSelect,
      });
    });
  });

  describe("countUnreadByUserId", () => {
    it("should return count of unread notifications", async () => {
      mockPrismaService.notification.count.mockResolvedValue(5);

      const result = await service.countUnreadByUserId("user-123");

      expect(result).toEqual({ count: 5 });
      expect(mockPrismaService.notification.count).toHaveBeenCalledWith({
        where: { userId: "user-123", isRead: false },
      });
    });
  });

  describe("markAsRead", () => {
    it("should throw NotFoundException if notification is not found for the user (security check)", async () => {
      mockPrismaService.notification.findFirst.mockResolvedValue(null);

      await expect(
        service.markAsRead("notif-1", "user-123")
      ).rejects.toThrow(new NotFoundException("NOT_FOUND"));

      expect(mockPrismaService.notification.findFirst).toHaveBeenCalledWith({
        where: { id: "notif-1", userId: "user-123" },
      });
    });

    it("should mark notification as read and emit updated event on success", async () => {
      const mockNotif = { id: "notif-1", userId: "user-123", isRead: false };
      const mockUpdated = { id: "notif-1", userId: "user-123", isRead: true };
      mockPrismaService.notification.findFirst.mockResolvedValue(mockNotif);
      mockPrismaService.notification.update.mockResolvedValue(mockUpdated);

      const result = await service.markAsRead("notif-1", "user-123");

      expect(result).toEqual(mockUpdated);
      expect(mockPrismaService.notification.update).toHaveBeenCalledWith({
        where: { id: "notif-1" },
        select: notificationSelect,
        data: {
          isRead: true,
          readAt: expect.any(Date),
        },
      });
      expect(mockNotificationsGateway.emitNotificationUpdated).toHaveBeenCalledWith("user-123", mockUpdated);
    });
  });

  describe("markAllAsRead", () => {
    it("should return early with empty array if there are no unread notifications", async () => {
      mockPrismaService.notification.findMany.mockResolvedValue([]);

      const result = await service.markAllAsRead("user-123");

      expect(result).toEqual([]);
      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
    });

    it("should update all unread notifications in transaction and emit gateway updates", async () => {
      const unreadList = [
        { id: "n-1", userId: "user-123" },
        { id: "n-2", userId: "user-123" },
      ];
      mockPrismaService.notification.findMany.mockResolvedValue(unreadList);
      mockPrismaService.$transaction.mockResolvedValue([
        { id: "n-1", userId: "user-123", isRead: true },
        { id: "n-2", userId: "user-123", isRead: true },
      ]);

      const result = await service.markAllAsRead("user-123");

      expect(result.length).toBe(2);
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(mockNotificationsGateway.emitNotificationUpdated).toHaveBeenCalledTimes(2);
    });
  });
});
```

- [ ] **Step 2: Run test suite to verify tests pass**
  Run: `pnpm.cmd test src/modules/notifications/notifications.service.spec.ts`
  Expected: PASS

- [ ] **Step 3: Commit**
  Run:
  ```bash
  git add src/modules/notifications/notifications.service.spec.ts
  git commit -m "test(notifications): add read status and security check tests"
  ```

---

### Task 8: Write NotificationsService Invite-Notification Tests

**Files:**
- Modify: `src/modules/notifications/notifications.service.spec.ts`

- [ ] **Step 1: Add invite-related notification tests**
  Add the remaining tests for `markWorkspaceInviteNotificationsAsRead` and `createWorkspaceInviteNotification` to `notifications.service.spec.ts`:

```typescript
  describe("markWorkspaceInviteNotificationsAsRead", () => {
    it("should return early if no invite notifications found", async () => {
      mockPrismaService.notification.findMany.mockResolvedValue([]);

      const result = await service.markWorkspaceInviteNotificationsAsRead("invite-123");

      expect(result).toEqual([]);
      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
    });

    it("should mark invite notifications as read and emit updates on success", async () => {
      mockPrismaService.notification.findMany.mockResolvedValue([{ id: "n-1", userId: "user-123" }]);
      mockPrismaService.$transaction.mockResolvedValue([{ id: "n-1", userId: "user-123", isRead: true }]);

      const result = await service.markWorkspaceInviteNotificationsAsRead("invite-123");

      expect(result.length).toBe(1);
      expect(mockNotificationsGateway.emitNotificationUpdated).toHaveBeenCalledWith("user-123", expect.any(Object));
    });
  });

  describe("createWorkspaceInviteNotification", () => {
    it("should throw NotFoundException if workspace invite is not found", async () => {
      mockPrismaService.workspaceInvite.findUnique.mockResolvedValue(null);

      await expect(
        service.createWorkspaceInviteNotification("invite-123")
      ).rejects.toThrow(new NotFoundException("NOT_FOUND"));
    });

    it("should return null if recipient user is not found", async () => {
      mockPrismaService.workspaceInvite.findUnique.mockResolvedValue({
        id: "invite-123",
        email: "nonexistent@example.com",
      });
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.createWorkspaceInviteNotification("invite-123");

      expect(result).toBeNull();
    });

    it("should upsert invite notification and emit created event on success", async () => {
      mockPrismaService.workspaceInvite.findUnique.mockResolvedValue({
        id: "invite-123",
        email: "invited@example.com",
        role: Role.MEMBER,
        workspace: { name: "Workspace X" },
        inviter: { name: "Inviter Y" },
      });
      mockPrismaService.user.findUnique.mockResolvedValue({ id: "user-recipient" });
      mockPrismaService.notification.upsert.mockResolvedValue({
        id: "notif-abc",
        userId: "user-recipient",
        title: "You were invited to Workspace X",
      });

      const result = await service.createWorkspaceInviteNotification("invite-123");

      expect(result).toEqual({
        id: "notif-abc",
        userId: "user-recipient",
        title: "You were invited to Workspace X",
      });
      expect(mockPrismaService.notification.upsert).toHaveBeenCalledWith({
        where: {
          userId_workspaceInviteId: {
            userId: "user-recipient",
            workspaceInviteId: "invite-123",
          },
        },
        update: {
          type: NotificationType.WORKSPACE_INVITE,
          title: "You were invited to Workspace X",
          message: "Inviter Y invited you to join Workspace X as member.",
        },
        create: {
          userId: "user-recipient",
          workspaceInviteId: "invite-123",
          type: NotificationType.WORKSPACE_INVITE,
          title: "You were invited to Workspace X",
          message: "Inviter Y invited you to join Workspace X as member.",
        },
        select: notificationSelect,
      });
      expect(mockNotificationsGateway.emitNotificationCreated).toHaveBeenCalledWith("user-recipient", expect.any(Object));
    });
  });
```

- [ ] **Step 2: Run all workspace and notification test suites to verify they pass**
  Run:
  - `pnpm.cmd test src/modules/workspaces/workspace.service.spec.ts`
  - `pnpm.cmd test src/modules/notifications/notifications.service.spec.ts`
  Expected: PASS

- [ ] **Step 3: Commit**
  Run:
  ```bash
  git add src/modules/notifications/notifications.service.spec.ts
  git commit -m "test(notifications): add invite notification creation and read tests"
  ```
