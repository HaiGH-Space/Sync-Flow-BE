# Frontend Integration Guide: LiveKit Video & Audio Meeting Calls

This document provides a comprehensive guide for the Frontend team to integrate LiveKit video and audio call features with the backend API in **Sync-Flow**.

---

## 1. Overview & Architecture

- **Backend Provider**: LiveKit Server SDK (`livekit-server-sdk`) integrated via `LiveKitService`.
- **Room Naming Scheme**: `channel:<channelId>` (e.g., `channel:cm7abc1230001`).
- **Identity Scheme**: User ID (`user.id`).
- **Participant Metadata**: Encoded JSON string containing user avatar (`{ "avatar": string | null }`) and name (`user.name || user.email`).
- **Role Permissions**:
  - All channel members can request room tokens and list participants.
  - Workspace Admins (`Role.ADMIN`) obtain `roomAdmin: true` grants and can mute tracks or kick participants.

---

## 2. API Reference

Base Endpoint Path: `/workspaces/:workspaceId/channels/:channelId/video`

### 2.1 Request LiveKit Access Token

Generates a signed JWT Access Token for joining a LiveKit meeting call in a specific channel.

- **HTTP Method**: `POST`
- **URL Path**: `/workspaces/:workspaceId/channels/:channelId/video/token`
- **Auth Guard**: `SessionAuthGuard`, `WorkspaceRolesGuard`
- **Request Body**: None

#### Response `200 OK` (`LiveKitTokenResponseDto`):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "roomName": "channel:cm7abc1230001",
  "wsUrl": "wss://your-livekit-server.com"
}
```

#### Token Payload Grants:
- `identity`: User ID (`userId`)
- `name`: User display name or email
- `metadata`: `JSON.stringify({ avatar: user.image })`
- `roomJoin`: `true`
- `canPublish`: `true`
- `canSubscribe`: `true`
- `roomAdmin`: `true` (if user is Workspace Admin) / `false` (otherwise)

---

### 2.2 List Active Participants

Fetches the real-time list of active participants connected to the channel room on the LiveKit server.

- **HTTP Method**: `GET`
- **URL Path**: `/workspaces/:workspaceId/channels/:channelId/video/participants`
- **Auth Guard**: `SessionAuthGuard`, `WorkspaceRolesGuard`
- **Request Body**: None

#### Response `200 OK`:
Returns an array of LiveKit `ParticipantInfo` objects containing identity, tracks, state, metadata, and join timestamp.

---

### 2.3 Mute Participant Track (Admin Only)

Allows Workspace Admins to remotely mute or unmute a specific published track (audio/video) of any participant in the room.

- **HTTP Method**: `POST`
- **URL Path**: `/workspaces/:workspaceId/channels/:channelId/video/mute-participant`
- **Auth Guard**: `SessionAuthGuard`, `WorkspaceRolesGuard`, `@Roles(Role.ADMIN)`
- **Request Body** (`MuteParticipantDto`):
```json
{
  "participantIdentity": "user_id_123",
  "trackSid": "TR_AM12345678",
  "muted": true
}
```

#### Response `200 OK`:
Returns updated TrackInfo/Participant object from LiveKit server.

---

### 2.4 Remove / Kick Participant (Admin Only)

Allows Workspace Admins to force disconnect/kick a participant from the channel call.

- **HTTP Method**: `DELETE`
- **URL Path**: `/workspaces/:workspaceId/channels/:channelId/video/participants/:participantIdentity`
- **Auth Guard**: `SessionAuthGuard`, `WorkspaceRolesGuard`, `@Roles(Role.ADMIN)`
- **URL Parameters**:
  - `workspaceId`: Target workspace ID
  - `channelId`: Target channel ID
  - `participantIdentity`: User ID of participant to remove

#### Response `200 OK`:
Returns status object from LiveKit server upon removal.

---

## 3. Frontend Integration Guide (React & LiveKit SDK)

### Step 1: Install Dependencies
In the frontend application repository (`fe`), install `@livekit/components-react` and `livekit-client`:

```bash
pnpm add @livekit/components-react @livekit/components-styles livekit-client
```

### Step 2: Fetch LiveKit Token & Server URL
When user clicks "Join Call" or opens a video channel view:

```typescript
import axios from 'axios';

interface LiveKitTokenResponse {
  token: string;
  roomName: string;
  wsUrl: string;
}

async function fetchLiveKitToken(workspaceId: string, channelId: string): Promise<LiveKitTokenResponse> {
  const response = await axios.post<LiveKitTokenResponse>(
    `/workspaces/${workspaceId}/channels/${channelId}/video/token`,
    {},
    { withCredentials: true }
  );
  return response.data;
}
```

### Step 3: Implement Call Component with React SDK
Use `<LiveKitRoom>` wrapper along with `<VideoConference />` or custom participant tiles:

```tsx
import React, { useState, useEffect } from 'react';
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  ControlBar,
  useParticipants,
} from '@livekit/components-react';
import '@livekit/components-styles';

interface ChannelCallProps {
  workspaceId: string;
  channelId: string;
  onLeave?: () => void;
}

export const ChannelCall: React.FC<ChannelCallProps> = ({ workspaceId, channelId, onLeave }) => {
  const [tokenData, setTokenData] = useState<{ token: string; wsUrl: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLiveKitToken(workspaceId, channelId)
      .then((data) => setTokenData({ token: data.token, wsUrl: data.wsUrl }))
      .catch((err) => setError(err.response?.data?.message || 'Failed to join video call'));
  }, [workspaceId, channelId]);

  if (error) return <div className="call-error">{error}</div>;
  if (!tokenData) return <div className="call-loading">Connecting to call...</div>;

  return (
    <LiveKitRoom
      video={true}
      audio={true}
      token={tokenData.token}
      serverUrl={tokenData.wsUrl}
      onDisconnected={() => {
        setTokenData(null);
        if (onLeave) onLeave();
      }}
      data-lk-theme="default"
      style={{ height: '100vh' }}
    >
      <VideoConference />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
};
```

### Step 4: Extracting Avatar & Display Metadata
To render participant profile photos in participant cards or audio tiles:

```typescript
import { Participant } from 'livekit-client';

export function getParticipantMetadata(participant: Participant) {
  let avatarUrl: string | null = null;
  try {
    if (participant.metadata) {
      const parsed = JSON.parse(participant.metadata);
      avatarUrl = parsed.avatar || null;
    }
  } catch (e) {
    console.error('Failed to parse participant metadata', e);
  }

  return {
    displayName: participant.name || participant.identity,
    avatarUrl,
  };
}
```

### Step 5: Admin Actions (Mute & Remote Kick)
For Workspace Admins rendering participant context menus:

```typescript
// Mute participant's track
async function muteParticipantTrack(workspaceId: string, channelId: string, participantIdentity: string, trackSid: string) {
  await axios.post(`/workspaces/${workspaceId}/channels/${channelId}/video/mute-participant`, {
    participantIdentity,
    trackSid,
    muted: true,
  });
}

// Kick participant from call
async function kickParticipant(workspaceId: string, channelId: string, participantIdentity: string) {
  await axios.delete(`/workspaces/${workspaceId}/channels/${channelId}/video/participants/${participantIdentity}`);
}
```

---

## 4. Error Handling & Codes

| Error Code | HTTP Status | Trigger Condition | Recommended UI Action |
|------------|-------------|-------------------|-----------------------|
| `FORBIDDEN` | 403 | User is not a member of the channel or non-admin calls mute/kick endpoints | Show access denied alert or toast |
| `LIVEKIT_ROOM_NOT_FOUND` | 404 | Requested channel room is not currently active on LiveKit server | Inform user that call has ended or room is offline |
| `LIVEKIT_PARTICIPANT_NOT_FOUND` | 404 | Target participant identity is not present in the room | Refresh active participant list |
| `LIVEKIT_ERROR` | 500 | LiveKit server connection failure or internal error | Show retry button or toast notice |

---

## 5. Source Code References

- **Controller**: [ChannelVideoController](../../src/modules/channel/channel-video.controller.ts)
- **Service**: [ChannelService](../../src/modules/channel/channel.service.ts)
- **LiveKit Provider**: [LiveKitService](../../src/providers/livekit/livekit.service.ts)
- **Token Response DTO**: [LiveKitTokenResponseDto](../../src/modules/channel/dto/livekit-token-response.dto.ts)
- **Mute Track DTO**: [MuteParticipantDto](../../src/modules/channel/dto/mute-participant.dto.ts)
