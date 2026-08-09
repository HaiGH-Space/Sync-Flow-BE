# LiveKit Review Fixes Design Specification

**Date:** 2026-07-29  
**Feature:** LiveKit Integration Code Review Fixes  
**Branch:** `feat/livekit-integration`  

## 1. Overview

This specification details the structural, security, and documentation enhancements for the LiveKit video integration module on the NestJS backend (`sync-flow/be`). These changes address feedback from code review concerning multi-tenant workspace isolation, OpenAPI documentation completeness, and configurable token TTL.

---

## 2. Component Design & Changes

### 2.1 Workspace Ownership Validation (`ChannelService` & `ChannelVideoController`)

**Problem:**  
In `ChannelVideoController`, `muteParticipant` and `removeParticipant` endpoints verify that the user is an `ADMIN` in the workspace specified in the URL (`workspaceId`). However, `ChannelService` did not check whether the target `channelId` actually belonged to that `workspaceId`.

**Solution:**  
1. In `ChannelVideoController`, pass `workspaceId` as a parameter to `ChannelService.muteChannelParticipant` and `ChannelService.removeChannelParticipant`.
2. In `ChannelService`, perform a database query checking channel ownership before invoking `LiveKitService`:

```typescript
const channel = await this.prisma.channel.findFirst({
  where: {
    id: channelId,
    project: { workspaceId },
  },
});

if (!channel) {
  throw new ForbiddenException(ErrorCode.FORBIDDEN);
}
```

---

### 2.2 OpenAPI / Swagger Documentation (`ChannelVideoController`)

**Problem:**  
`getChannelVideoToken` had `@ApiOkResponseGeneric(LiveKitTokenResponseDto)`, but other routes (`getChannelParticipants`, `muteParticipant`, `removeParticipant`) were missing explicit Swagger response decorators.

**Solution:**  
Add `@ApiOkResponseGeneric(...)` decorators across all endpoints in `ChannelVideoController` to ensure full OpenAPI documentation completeness.

---

### 2.3 Configurable LiveKit Token TTL (`AppConfigService` & `LiveKitService`)

**Problem:**  
LiveKit access token TTL was hardcoded to `"2h"`.

**Solution:**  
1. Add `livekitTokenTtl` property to `AppConfigService`:
```typescript
get livekitTokenTtl() {
  return this.configService.get<string>("LIVEKIT_TOKEN_TTL") ?? "2h";
}
```
2. Update `LiveKitService.generateToken()` to use `options.ttl ?? this.configService.livekitTokenTtl`.

---

## 3. Testing Strategy

1. **`channel.service.spec.ts`**:
   - Test `muteChannelParticipant` and `removeChannelParticipant` with valid channel & workspace match.
   - Test throwing `ForbiddenException` when `channelId` does not belong to `workspaceId`.
2. **`livekit.service.spec.ts`**:
   - Verify default TTL resolution from `AppConfigService`.
3. **Automated Verification**:
   - Run `pnpm.cmd build` and `pnpm.cmd test`.

---

## 4. Verification & Criteria for Success

- All NestJS modules compile without TypeScript errors.
- All unit test suites pass (19 test suites, 111+ tests).
- Workspace scoping is strictly enforced for channel moderation actions.
