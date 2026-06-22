# Notifications Module

## Overview

The Notifications module owns user notification reads and workspace-invite notification delivery. It exposes REST endpoints under `/notifications` for listing notifications, checking unread count, and marking notifications as read, and it also publishes websocket updates over the `/notifications` namespace.

## Features

- Authenticated REST access through `SessionAuthGuard`.
- Paginated or unpaginated notification listing for the current user.
- Unread notification count for the current user.
- Mark a single notification as read.
- Mark all unread notifications as read.
- Workspace-invite notification creation and read-state sync.
- Websocket push events for notification creation and updates.

## REST API

| Method | Path | Guard | Purpose | Response |
| --- | --- | --- | --- | --- |
| `GET` | `/notifications/me` | `SessionAuthGuard` | List the current user’s notifications. Supports optional `page` and `limit` query params. | `NotificationEntity[]` |
| `GET` | `/notifications/me/unread-count` | `SessionAuthGuard` | Return the current user’s unread notification count. | `{ count: number }` |
| `PATCH` | `/notifications/me/read-all` | `SessionAuthGuard` | Mark all unread notifications for the current user as read. | `NotificationEntity[]` |
| `PATCH` | `/notifications/:notificationId/read` | `SessionAuthGuard` | Mark one notification as read for the current user. | `NotificationEntity` |

Notes:

- `page` and `limit` must both be positive integers when provided.
- `GET /notifications/me` returns all notifications when neither query param is supplied.

## Websocket

- Namespace: `/notifications`
- Server-emitted events:
  - `notification_created`
  - `notification_updated`
- The gateway authenticates with the session token from the cookie or websocket auth payload, then joins the socket to the user id room.
- Notifications are emitted to the user id room, so updates only reach the intended user.

## Data Model Summary

The notification payload is selected from Prisma and returned through the REST API and websocket events with this shape:

- `id`
- `userId`
- `workspaceInviteId` | `null`
- `type` (`NotificationType`)
- `title`
- `message` | `null`
- `workspaceInvite` | `null`
- `isRead`
- `readAt` | `null`
- `createdAt`
- `updatedAt`

The current invite-related type is `NotificationType.WORKSPACE_INVITE`.

`workspaceInvite` is included as a nested object and currently carries:

- `id`
- `workspaceId`
- `inviterId`
- `email`
- `role`
- `token`
- `expiresAt`
- `createdAt`
- `workspace`
- `inviter`

## Workflow Notes

1. When a workspace invite is created, `WorkspaceService.inviteMember()` upserts the invite and calls `NotificationsService.createWorkspaceInviteNotification(invite.id)`.
2. `NotificationsService.createWorkspaceInviteNotification()` loads the invite, resolves the recipient by email, upserts a notification with `NotificationType.WORKSPACE_INVITE`, and emits `notification_created` to that user’s websocket room.
3. When an invite is accepted, `WorkspaceService.acceptInvite()` deletes the invite in a transaction and then calls `NotificationsService.markWorkspaceInviteNotificationsAsRead(invite.id)`.
4. `markWorkspaceInviteNotificationsAsRead()` updates any unread notifications tied to that invite, then emits `notification_updated` for each updated notification.
5. The REST read endpoints follow the same update pattern and also emit `notification_updated` after persisting the read state.

## Current Scope And Limitations

- The module currently implements workspace-invite notifications only.
- Notification creation is driven by workspace invite flow, not by a generic public notification creation endpoint.
- The websocket gateway only emits server-side events; it does not define custom client-to-server notification actions.