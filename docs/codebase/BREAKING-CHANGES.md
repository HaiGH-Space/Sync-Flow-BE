# Frontend Integration & Breaking Changes Guide: Channel & LiveKit Module Update

This guide outlines all API contract changes, authorization rules, and required Frontend modifications introduced in the recent backend update (`fix/channel-security-access-control`).

---

## Table of Contents
1. [Channel Creation Payload & Validation Rules](#1-channel-creation-payload--validation-rules)
2. [DM Channel Deduplication Flow](#2-dm-channel-deduplication-flow)
3. [Public Channel Discovery & Sidebar Display](#3-public-channel-discovery--sidebar-display)
4. [Unread Messages & Read Receipts (`lastReadAt`)](#4-unread-messages--read-receipts-lastreadat)
5. [LiveKit / Video Token Requests](#5-livekit--video-token-requests)

---

## 1. Channel Creation Payload & Validation Rules

### Endpoint
`POST /projects/:projectId/channels`

### Request DTO (`CreateChannelDto`)
```typescript
export interface CreateChannelPayload {
  name?: string;                             // Channel name (Optional for DIRECT, typical for GROUP)
  type: 'GROUP' | 'DIRECT';                  // Channel type (Required)
  visibility?: 'PUBLIC' | 'PRIVATE';         // Channel visibility (Optional, default: 'PUBLIC' for GROUP)
  memberIds?: string[];                      // Array of workspace user UUIDs to invite (Optional)
}
```

### Expectations per Channel Scenario

| Channel Type | Visibility Input | Backend Forced Visibility | `memberIds` Expectation |
| :--- | :--- | :--- | :--- |
| **`PUBLIC` Group** | `'PUBLIC'` (or omitted) | `'PUBLIC'` | Can be omitted or empty (`[]`). All workspace members automatically have access. |
| **`PRIVATE` Group** | `'PRIVATE'` | `'PRIVATE'` | Must contain pre-selected workspace user IDs to grant access. Creator is auto-added. |
| **`DIRECT` (DM)** | Ignored | Forced to **`PRIVATE`** | **MUST contain exactly 1 target user ID** (excluding creator). |

### Important Backend Rules & Validations
- **Workspace Membership Verification**: All IDs passed in `memberIds` (and the current logged-in user) **must be active members** of the parent workspace of `:projectId`. If any user ID is not in the workspace, the backend responds with `400 Bad Request` (`ErrorCode.BAD_REQUEST`).
- **Direct Message Target Restriction**: For `DIRECT` channels, `memberIds` after filtering out `creatorId` must yield **exactly 1 user ID**. Passing 0 or >1 user IDs will throw `400 Bad Request`.

#### Example: Creating a Public Channel
```json
// POST /projects/p-123/channels
{
  "name": "announcements",
  "type": "GROUP",
  "visibility": "PUBLIC"
}
```

#### Example: Creating a Private Group Channel
```json
// POST /projects/p-123/channels
{
  "name": "backend-core",
  "type": "GROUP",
  "visibility": "PRIVATE",
  "memberIds": ["user-uuid-2", "user-uuid-3"]
}
```

#### Example: Creating a Direct Message
```json
// POST /projects/p-123/channels
{
  "type": "DIRECT",
  "memberIds": ["target-user-uuid"]
}
```

---

## 2. DM Channel Deduplication Flow

### Behavior
When sending a `POST /projects/:projectId/channels` request with `type: "DIRECT"`:
- The backend checks if a `DIRECT` channel already exists between the `creatorId` and the `recipientId` within the specified `projectId`.
- **Existing Channel Found**: If an existing DM channel is found, the backend **returns the existing channel object** (HTTP status `201`/`200`) instead of creating a duplicate or throwing an error.
- **No Existing DM**: If no DM exists, a new `DIRECT` channel is created and returned.

### Response Payload Structure
```json
{
  "id": "channel-uuid-123",
  "name": null,
  "type": "DIRECT",
  "visibility": "PRIVATE",
  "projectId": "project-uuid-456",
  "createdAt": "2026-08-01T10:00:00.000Z",
  "updatedAt": "2026-08-07T12:00:00.000Z",
  "members": [
    { "id": "cm-1", "channelId": "channel-uuid-123", "userId": "creator-uuid" },
    { "id": "cm-2", "channelId": "channel-uuid-123", "userId": "recipient-uuid" }
  ]
}
```

### Frontend Implementation Guidelines
Frontend should handle the response seamlessly without assuming a new ID was generated:

```typescript
async function openOrCreateDM(projectId: string, targetUserId: string) {
  try {
    const response = await api.post(`/projects/${projectId}/channels`, {
      type: 'DIRECT',
      memberIds: [targetUserId],
    });
    
    const channel = response.data;
    
    // Gracefully navigate to the returned channel (whether existing or new)
    router.push(`/projects/${projectId}/channels/${channel.id}`);
  } catch (error) {
    console.error('Failed to open DM channel:', error);
  }
}
```

---

## 3. Public Channel Discovery & Sidebar Display

### Endpoint
`GET /projects/:projectId/channels` (`findAllMyChannels`)

### Backend Filtering Logic
The endpoint queries channels in `:projectId` matching:
$$\text{Channel} \in \{ c \mid c.\text{projectId} = \text{projectId} \land (c.\text{visibility} = \text{PUBLIC} \lor \text{currentUser} \in c.\text{members}) \}$$

### Key Frontend Impacts & Component Safeguards
1. **Automatic Public Channel Appearance**: Any public channel in a project is automatically visible in `findAllMyChannels` for all members of the workspace. Public channels **do not require an explicit `ChannelMember` record in the database**.
2. **`channel.members` May Be Empty (`[]`)**:
   - Because users do not need `ChannelMember` rows to view public channels, `channel.members` returned for public channels may be an empty array `[]` or only contain the creator.
   - **Frontend Defensive Coding**:
     - Components relying on `channel.members` (e.g. avatar stacks, member count labels) **must handle empty arrays `[]` or null values gracefully**.
     - Do not rely on `channel.members.length` to measure total workspace audience for public channels.
     - If full member lists for a project/workspace are required, query `/workspaces/:workspaceId/members` or project member endpoints instead.

---

## 4. Unread Messages & Read Receipts (`lastReadAt`)

### Schema Update
The `ChannelMember` entity now includes a `lastReadAt` timestamp:
```prisma
model ChannelMember {
  id         String    @id @default(uuid())
  channelId  String    @map("channel_id")
  userId     String    @map("user_id")
  joinedAt   DateTime  @default(now()) @map("joined_at")
  lastReadAt DateTime? @map("last_read_at")
}
```

### Service Method & Lazy Upsert Pattern
`ChannelService.updateLastReadAt(userId, channelId)`:
- Verifies that the user has channel access (workspace member for `PUBLIC` channels or explicit member for `PRIVATE` channels).
- **Lazy Upsert**: If the user visits a `PUBLIC` channel for the first time, calling this function **lazily creates the `ChannelMember` row** and sets `lastReadAt = now()`. If the row already exists, it updates `lastReadAt = now()`.

### Usage Trigger
When a user opens/views a channel or scrolls to read messages:
- Trigger read receipt updates to mark unread messages as read.
- **Unread Count Logic**:
  $$\text{Unread Messages} = |\{ m \in \text{Messages} \mid m.\text{createdAt} > (\text{member.lastReadAt} \mathbin{\mathtt{??}} \text{member.joinedAt}) \}|$$

---

## 5. LiveKit / Video Token Requests

### Endpoint
`POST /workspaces/:workspaceId/channels/:channelId/video/token`

### Strict `:workspaceId` Route Requirement
- The `:workspaceId` path parameter **MUST match the parent workspace ID of the channel's project**.
- If `:workspaceId` does not match the channel's workspace or the user is not a member of `:workspaceId`, the backend returns `403 Forbidden` (`ErrorCode.FORBIDDEN`).

### Access Controls for LiveKit Video Rooms

```
                     +---------------------------------------+
                     | User Requests LiveKit Video Token     |
                     +---------------------------------------+
                                         |
                                         v
                     +---------------------------------------+
                     | Is User a Member of :workspaceId &    |
                     | Workspace matches Channel's Workspace?|
                     +---------------------------------------+
                                    /         \
                                  NO           YES
                                 /               \
                                v                 v
                      +-------------------+   +----------------------------------+
                      | 403 FORBIDDEN     |   | Is Channel PUBLIC or PRIVATE?    |
                      +-------------------+   +----------------------------------+
                                              /                                  \
                                        PUBLIC                                    PRIVATE
                                         /                                          \
                                        v                                            v
                         +-----------------------------+               +----------------------------+
                         | ACCESS GRANTED              |               | Is User in channel.members?|
                         | Returns LiveKit JWT Token   |               +----------------------------+
                         +-----------------------------+                              /            \
                                                                                    YES             NO
                                                                                    /                 \
                                                                                   v                   v
                                                                    +-------------------+   +-------------------+
                                                                    | ACCESS GRANTED    |   | 403 FORBIDDEN     |
                                                                    +-------------------+   +-------------------+
```

### Success Response Payload
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "roomName": "channel:123e4567-e89b-12d3-a456-426614174000",
  "wsUrl": "wss://livekit.example.com"
}
```

### Video Control Endpoints Summary

| HTTP Method | Route | Description | Auth Requirement |
| :--- | :--- | :--- | :--- |
| `POST` | `/workspaces/:workspaceId/channels/:channelId/video/token` | Fetch LiveKit JWT connection token | Member of Workspace & Channel Access |
| `GET` | `/workspaces/:workspaceId/channels/:channelId/video/participants` | Fetch current room participants | Member of Workspace & Channel Access |
| `POST` | `/workspaces/:workspaceId/channels/:channelId/video/mute-participant` | Mute track/audio of a participant | Admin Role (`Role.ADMIN`) |
| `DELETE` | `/workspaces/:workspaceId/channels/:channelId/video/participants/:participantIdentity` | Kick participant from room | Admin Role (`Role.ADMIN`) |

---
