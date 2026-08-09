# LiveKit Server SDK Integration for Channel Voice & Video Conferencing

**Date:** 2026-07-27  
**Status:** Approved  
**Target System:** NestJS Backend (`sync-flow/be`)

---

## 1. Overview

This document specifies the integration of `livekit-server-sdk` into the NestJS backend (`sync-flow/be`) to enable real-time voice and video conferencing capabilities within channels (similar to Discord voice channels or Google Meet embedded rooms).

### Key Features
1. **Global Infrastructure Provider (`LiveKitModule`)**: Reusable, globally injectable service managing LiveKit token generation, singleton `RoomServiceClient`, and singleton `WebhookReceiver`.
2. **Channel-Based Room Authorization**: Dynamic generation of short/long-lived LiveKit access tokens (default 24-hour TTL for voice channels) using standardized room names (`channel:${channelId}`).
3. **Room Administration**: Remote track muting and participant removal (kick) capability backed by NestJS role-based access control (`@Roles()` decorator and `WorkspaceRolesGuard`).
4. **Resilient Exception Handling**: Graceful translation of LiveKit SDK errors (e.g., participant disconnected prior to admin request) into NestJS standard HTTP exceptions (`NotFoundException` / 404).

---

## 2. Architecture & Component Design

### 2.1 Provider Infrastructure (`src/providers/livekit/`)

* **`LiveKitModule`** (`@Global()`):
  * Marked as `@Global()`.
  * Exports `LiveKitService`.
  * Registered in `AppModule`.

* **`LiveKitService`** (`src/providers/livekit/livekit.service.ts`):
  * Implements `OnModuleInit`.
  * **State**:
    * `private roomService: RoomServiceClient`
    * `private webhookReceiver: WebhookReceiver`
  * **`onModuleInit()`**:
    * Reads `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` from `ConfigService`.
    * Initializes `RoomServiceClient` host URL, API Key, and Secret once during module initialization.
    * Initializes `WebhookReceiver` with API Key and Secret once.
  * **Methods**:
    * `generateToken(params: { roomName: string; identity: string; name: string; metadata?: Record<string, any>; isAdmin?: boolean; ttl?: string | number }): Promise<string>`
      * Sets `roomJoin: true`, `room: roomName`, `canPublish: true`, `canSubscribe: true`.
      * Automatically serializes `metadata` via `JSON.stringify(metadata)` if provided.
      * Sets `roomAdmin: true` if `isAdmin` is `true`.
      * Defaults `ttl` to `'24h'` for voice/video channels.
      * Returns signed JWT string.
    * `listParticipants(roomName: string)`: Calls `this.roomService.listParticipants(roomName)`.
    * `muteParticipant(roomName: string, identity: string, trackSid: string, muted: boolean)`: Calls `this.roomService.mutePublishedTrack(roomName, identity, trackSid, muted)`.
    * `removeParticipant(roomName: string, identity: string)`: Calls `this.roomService.removeParticipant(roomName, identity)`.
    * `verifyWebhook(body: string | Buffer, authHeader: string)`: Uses `this.webhookReceiver.receive(body, authHeader)` for verifying signed LiveKit webhooks.

---

### 2.2 Channel Voice & Video Module Integration (`src/modules/channel/`)

* **Endpoints Structure**:
  * Controllers decorate endpoints with `@UseGuards(SessionAuthGuard, WorkspaceRolesGuard)` and declarative `@Roles(...)` decorators.

* **Endpoints**:
  1. `POST /workspaces/:workspaceId/channels/:channelId/video/token`
     * **Description**: Generates an Access Token for joining the channel's video/voice room.
     * **Room Name**: `channel:${channelId}`.
     * **RBAC**: Requires authenticated workspace/channel member.
     * **Response**: `{ token: string, roomName: string, wsUrl: string }`.

  2. `GET /workspaces/:workspaceId/channels/:channelId/video/participants`
     * **Description**: Returns list of current active participants in the LiveKit room.
     * **RBAC**: Requires channel membership.

  3. `POST /workspaces/:workspaceId/channels/:channelId/video/mute-participant`
     * **Description**: Mutes an audio or video track of a target participant.
     * **RBAC**: `@Roles(Role.ADMIN)` (Workspace Admin or Channel Owner).
     * **Body DTO**: `MuteParticipantDto` (`{ participantIdentity: string, trackSid: string, muted: boolean }`).

  4. `DELETE /workspaces/:workspaceId/channels/:channelId/video/participants/:identity`
     * **Description**: Disconnects/kicks a participant from the room.
     * **RBAC**: `@Roles(Role.ADMIN)` (Workspace Admin or Channel Owner).

---

## 3. Exception Handling & Resilience

To prevent unhandled exceptions (e.g., when a user leaves right before an admin clicks "mute" or "kick"):
* Service methods wrapping `RoomServiceClient` calls will intercept LiveKit API errors.
* If LiveKit returns "room not found" or "participant not found" error codes / messages, the service will throw NestJS `NotFoundException(ErrorCode.PARTICIPANT_NOT_FOUND)` / `NotFoundException(ErrorCode.ROOM_NOT_FOUND)`.

---

## 4. Environment Variables & Configuration

The following environment variables must be defined in `.env` and typed in `src/config/config.service.ts`:
```env
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
LIVEKIT_URL=http://localhost:7880
LIVEKIT_WS_URL=ws://localhost:7880
```

---

## 5. Verification Plan

1. **Unit Tests**:
   * Test `LiveKitService.generateToken` produces valid JWT tokens with correct grants, room name format (`channel:<id>`), and metadata.
   * Test `LiveKitService` exception catching and conversion to NestJS HTTP exceptions.
2. **Build Verification**:
   * Run `pnpm.cmd build` to verify clean NestJS compilation.
3. **Linting**:
   * Run `pnpm.cmd lint` on touched files.
