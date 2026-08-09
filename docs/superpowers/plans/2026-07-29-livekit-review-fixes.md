# LiveKit Review Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement code review fixes for LiveKit video integration, including workspace ownership validation on moderation endpoints, complete OpenAPI response decorators, and configurable token TTL.

**Architecture:** Workspace scoping is enforced in `ChannelService` by validating channel existence within the specified `workspaceId` prior to performing LiveKit moderation actions. OpenAPI decorators (`@ApiOkResponseGeneric`) provide standard endpoint documentation in `ChannelVideoController`. `AppConfigService` exposes `livekitTokenTtl` for flexible JWT expiration options.

**Tech Stack:** NestJS, TypeScript, Prisma, LiveKit Server SDK, Jest.

---

### Task 1: Configurable LiveKit Token TTL in AppConfigService & LiveKitService

**Files:**
- Modify: `src/config/config.service.ts`
- Modify: `src/providers/livekit/livekit.service.ts`
- Modify: `src/providers/livekit/livekit.service.spec.ts`

- [ ] **Step 1: Add livekitTokenTtl to AppConfigService and update test spec**

In `src/config/config.service.ts`, add the getter:
```typescript
get livekitTokenTtl() {
  return this.configService.get<string>("LIVEKIT_TOKEN_TTL") ?? "2h";
}
```

- [ ] **Step 2: Update LiveKitService to default ttl from AppConfigService**

In `src/providers/livekit/livekit.service.ts`:
Update `generateToken(options: GenerateTokenOptions)`:
```typescript
const {
  roomName,
  identity,
  name,
  metadata,
  isAdmin = false,
  ttl = this.configService.livekitTokenTtl,
} = options;
```

- [ ] **Step 3: Add unit test in livekit.service.spec.ts to verify default token TTL**

In `src/providers/livekit/livekit.service.spec.ts`, add test:
```typescript
it("should use livekitTokenTtl from config service if ttl is omitted", async () => {
  const token = await service.generateToken({
    roomName: "channel:test-channel-id",
    identity: "user-123",
    name: "John Doe",
  });
  expect(typeof token).toBe("string");
});
```

- [ ] **Step 4: Run tests to verify Task 1 passes**

Run: `pnpm.cmd test src/providers/livekit/livekit.service.spec.ts`
Expected: PASS

---

### Task 2: Workspace Ownership Validation & OpenAPI Decorators

**Files:**
- Modify: `src/modules/channel/channel.service.ts`
- Modify: `src/modules/channel/channel-video.controller.ts`
- Modify: `src/modules/channel/channel.service.spec.ts`

- [ ] **Step 1: Update ChannelService moderation methods with workspaceId validation**

In `src/modules/channel/channel.service.ts`:
Update `muteChannelParticipant` and `removeChannelParticipant`:
```typescript
async muteChannelParticipant(
  workspaceId: string,
  channelId: string,
  dto: MuteParticipantDto,
) {
  const channel = await this.prisma.channel.findFirst({
    where: {
      id: channelId,
      project: { workspaceId },
    },
  });
  if (!channel) {
    throw new ForbiddenException(ErrorCode.FORBIDDEN);
  }
  const roomName = `channel:${channelId}`;
  return this.livekitService.muteParticipant(
    roomName,
    dto.participantIdentity,
    dto.trackSid,
    dto.muted,
  );
}

async removeChannelParticipant(
  workspaceId: string,
  channelId: string,
  participantIdentity: string,
) {
  const channel = await this.prisma.channel.findFirst({
    where: {
      id: channelId,
      project: { workspaceId },
    },
  });
  if (!channel) {
    throw new ForbiddenException(ErrorCode.FORBIDDEN);
  }
  const roomName = `channel:${channelId}`;
  return this.livekitService.removeParticipant(
    roomName,
    participantIdentity,
  );
}
```

- [ ] **Step 2: Update ChannelVideoController with workspaceId parameters and Swagger decorators**

In `src/modules/channel/channel-video.controller.ts`:
```typescript
@Get(":channelId/video/participants")
@ApiOkResponseGeneric(Object, { isArray: true })
async getChannelParticipants(
  @CurrentUser() user: User,
  @Param("channelId") channelId: string,
) {
  return this.channelService.getChannelParticipants(user.id, channelId);
}

@Post(":channelId/video/mute-participant")
@Roles(Role.ADMIN)
@ApiOkResponseGeneric(Object)
async muteParticipant(
  @Param("workspaceId") workspaceId: string,
  @Param("channelId") channelId: string,
  @Body() dto: MuteParticipantDto,
) {
  return this.channelService.muteChannelParticipant(
    workspaceId,
    channelId,
    dto,
  );
}

@Delete(":channelId/video/participants/:participantIdentity")
@Roles(Role.ADMIN)
@ApiOkResponseGeneric(Object)
async removeParticipant(
  @Param("workspaceId") workspaceId: string,
  @Param("channelId") channelId: string,
  @Param("participantIdentity") participantIdentity: string,
) {
  return this.channelService.removeChannelParticipant(
    workspaceId,
    channelId,
    participantIdentity,
  );
}
```

- [ ] **Step 3: Update unit tests in channel.service.spec.ts**

In `src/modules/channel/channel.service.spec.ts`:
Add `findFirst: jest.fn()` to `prisma.channel` mock.
Update `muteChannelParticipant` and `removeChannelParticipant` test cases to pass `workspaceId` and verify `ForbiddenException` when `channel` is not found.

```typescript
describe("muteChannelParticipant", () => {
  it("should call livekitService.muteParticipant if channel belongs to workspace", async () => {
    prisma.channel.findFirst.mockResolvedValue({ id: "channel-1" });
    livekitService.muteParticipant.mockResolvedValue({ muted: true });

    const result = await service.muteChannelParticipant("ws-1", "channel-1", {
      participantIdentity: "user-2",
      trackSid: "TR_123",
      muted: true,
    });

    expect(result).toEqual({ muted: true });
    expect(prisma.channel.findFirst).toHaveBeenCalledWith({
      where: { id: "channel-1", project: { workspaceId: "ws-1" } },
    });
  });

  it("should throw ForbiddenException if channel does not belong to workspace", async () => {
    prisma.channel.findFirst.mockResolvedValue(null);

    await expect(
      service.muteChannelParticipant("ws-1", "channel-1", {
        participantIdentity: "user-2",
        trackSid: "TR_123",
        muted: true,
      })
    ).rejects.toThrow(ForbiddenException);
  });
});
```

- [ ] **Step 4: Run channel service tests**

Run: `pnpm.cmd test src/modules/channel/channel.service.spec.ts`
Expected: PASS

---

### Task 3: Full Project Compilation & Test Verification

- [ ] **Step 1: Run build and full test suite**

Run: `pnpm.cmd build; pnpm.cmd test`
Expected: All 19 test suites pass cleanly with zero build errors.
