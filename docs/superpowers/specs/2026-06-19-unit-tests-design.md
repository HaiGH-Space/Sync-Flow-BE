# Design Spec: Service-Level Unit Tests for Critical Modules

## 1. Goal & Context
The goal is to increase unit test coverage by writing comprehensive service-level tests for three critical modules: `AuthService`, `WorkspaceService`, and `NotificationsService`. 
We will prioritize edge cases, validation, transaction integrity, and security/ownership checks.

## 2. Clarifications on Requested Edge Cases
* **AuthService.login (Unverified Email)**: 
  * *Current State*: The current backend does not enforce email verification for logging in, and there is no verification route implemented.
  * *Design*: We will omit this test case to avoid introducing unsolicited business logic changes, keeping the change strictly surgical. If email verification enforcement is implemented in the future, the test suite can be updated accordingly.
* **WorkspaceService.acceptInvite (Transaction Rollback)**:
  * *Current State*: `acceptInvite` performs a transaction updating the membership database and deleting the invite.
  * *Design*: We will write a test where `tx.workspaceInvite.delete` fails, asserting that the transaction throws/rejects, which triggers Prisma's automatic rollback.
* **NotificationsService.markAsRead (Security/Ownership Check)**:
  * *Current State*: The service uses `where: { id: notificationId, userId }` to locate the notification.
  * *Design*: We will mock `prisma.notification.findFirst` to return `null` when a user attempts to update a notification that they do not own, asserting that it throws a `NotFoundException("NOT_FOUND")`.

---

## 3. Detailed Test Suites Design

### A. AuthService (`src/modules/auth/auth.service.spec.ts`)
We will add the following tests to `auth.service.spec.ts`:
1. **`register` (Edge Case - Email in use)**:
   * Mock `prisma.user.findUnique` to return an existing user.
   * Expect calling `register` to throw `ConflictException` with `ErrorCode.AUTH_EMAIL_IN_USE`.
2. **`register` (Edge Case - Transaction failure/rollback)**:
   * Mock `prisma.user.findUnique` to return null.
   * Mock `prisma.user.create` (inside transaction) to throw a `DbError`.
   * Expect calling `register` to throw `InternalServerErrorException` with `ErrorCode.INTERNAL_SERVER_ERROR`.
3. **`login` (Edge Case - User not found)**:
   * Mock `prisma.user.findUnique` to return null.
   * Expect `login` to throw `UnauthorizedException` with `ErrorCode.AUTH_INVALID_CREDENTIALS`.
4. **`login` (Edge Case - OAuth account only)**:
   * Mock `prisma.user.findUnique` to return a user.
   * Mock `prisma.account.findFirst` to return null or an account with no password.
   * Expect `login` to throw `UnauthorizedException` with `ErrorCode.AUTH_OAUTH_ACCOUNT_ONLY`.
5. **`login` (Edge Case - Invalid password)**:
   * Mock `prisma.user.findUnique` to return a user.
   * Mock `prisma.account.findFirst` to return a credentials account.
   * Mock `bcrypt.compare` to return false.
   * Expect `login` to throw `UnauthorizedException` with `ErrorCode.AUTH_INVALID_CREDENTIALS`.
6. **`login` (Happy Path)**:
   * Mock all dependencies (user exists, account exists, password is correct).
   * Mock `prisma.session.create` to return a session.
   * Expect `login` to return the session object.
7. **`logoutByToken` (Edge Case - No token)**:
   * Call `logoutByToken(undefined)`.
   * Expect early return without calling prisma.
8. **`logoutByToken` (Edge Case - Db failure)**:
   * Mock `prisma.session.deleteMany` to throw an error.
   * Expect `logoutByToken` to rethrow the error.

### B. WorkspaceService (`src/modules/workspaces/workspace.service.spec.ts`)
We will create `workspace.service.spec.ts`:
1. **`inviteMember` (Edge Case - User is already a member)**:
   * Mock `prisma.workspaceMember.findFirst` to return an existing membership.
   * Expect `inviteMember` to throw `ConflictException` with `ErrorCode.USER_ALREADY_MEMBER`.
2. **`inviteMember` (Happy Path)**:
   * Mock `prisma.workspaceMember.findFirst` to return null.
   * Mock `prisma.workspaceInvite.upsert` to return the created/updated invite.
   * Mock `notificationsService.createWorkspaceInviteNotification` to resolve.
   * Expect `inviteMember` to return `{ status: true }`.
3. **`acceptInvite` (Edge Case - Invalid token)**:
   * Mock `prisma.workspaceInvite.findUnique` to return null.
   * Expect `acceptInvite` to throw `NotFoundException` with `ErrorCode.INVALID_INVITE`.
4. **`acceptInvite` (Edge Case - Expired token)**:
   * Mock `prisma.workspaceInvite.findUnique` to return an invite with `expiresAt` in the past.
   * Expect `acceptInvite` to throw `NotFoundException` with `ErrorCode.EXPIRED_INVITE`.
5. **`acceptInvite` (Edge Case - Transaction rollback)**:
   * Mock valid invite.
   * Mock `tx.workspaceMember.create` to resolve.
   * Mock `tx.workspaceInvite.delete` to throw an error.
   * Expect transaction to reject, ensuring rollback.
6. **`acceptInvite` (Happy Path)**:
   * Mock valid invite.
   * Mock `tx.workspaceMember.create` and `tx.workspaceInvite.delete` to resolve.
   * Mock `notificationsService.markWorkspaceInviteNotificationsAsRead` to resolve.
   * Expect `acceptInvite` to return `{ status: true }`.
7. **`create` (Edge Case - Slug conflict)**:
   * Mock `prisma.workspace.findUnique` to return an existing workspace.
   * Expect `create` to throw `ConflictException` with `ErrorCode.WORKSPACE_SLUG_EXISTS`.
8. **`create` (Happy Path)**:
   * Mock `prisma.workspace.findUnique` to return null.
   * Mock `prisma.workspace.create` to resolve.
   * Expect `create` to return the created workspace.
9. **`update` (Edge Case - Slug conflict with other workspace)**:
   * Mock `prisma.workspace.findUnique` to return an existing workspace with a different ID.
   * Expect `update` to throw `ConflictException`.
10. **`update` (Happy Path)**:
    * Mock `prisma.workspace.findUnique` to return null (or same workspace).
    * Mock `prisma.workspace.update` to resolve.
    * Expect `update` to return updated workspace.

### C. NotificationsService (`src/modules/notifications/notifications.service.spec.ts`)
We will create `notifications.service.spec.ts`:
1. **`findAllByUserId`**:
   * Mock `prisma.notification.findMany`.
   * Verify pagination skip/take calculations when page/limit are provided.
2. **`countUnreadByUserId`**:
   * Mock `prisma.notification.count` to return a number.
   * Verify return shape is `{ count: X }`.
3. **`markAsRead` (Edge Case - Security / Ownership check)**:
   * Mock `prisma.notification.findFirst` to return null.
   * Expect `markAsRead` to throw `NotFoundException("NOT_FOUND")`.
4. **`markAsRead` (Happy Path)**:
   * Mock `prisma.notification.findFirst` to return the notification.
   * Mock `prisma.notification.update` to return the updated notification.
   * Expect `notificationsGateway.emitNotificationUpdated` to be called with updated notification.
5. **`markAllAsRead` (Edge Case - No unread notifications)**:
   * Mock `prisma.notification.findMany` to return empty array.
   * Expect `markAllAsRead` to return empty array and not perform updates or gateway emissions.
6. **`markAllAsRead` (Happy Path)**:
   * Mock `prisma.notification.findMany` to return unread list.
   * Mock transaction updates.
   * Verify gateway updates are emitted for each updated notification.
7. **`createWorkspaceInviteNotification` (Edge Case - Invite not found)**:
   * Mock `prisma.workspaceInvite.findUnique` to return null.
   * Expect `createWorkspaceInviteNotification` to throw `NotFoundException("NOT_FOUND")`.
8. **`createWorkspaceInviteNotification` (Edge Case - Recipient user not found)**:
   * Mock `prisma.workspaceInvite.findUnique` to return invite.
   * Mock `prisma.user.findUnique` to return null.
   * Expect `createWorkspaceInviteNotification` to return `null`.
9. **`createWorkspaceInviteNotification` (Happy Path)**:
   * Mock invite and user.
   * Mock `prisma.notification.upsert` to return the notification.
   * Expect gateway `emitNotificationCreated` to be called and return notification.
