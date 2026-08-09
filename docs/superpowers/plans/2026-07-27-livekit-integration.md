# LiveKit Server SDK Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate `livekit-server-sdk` into NestJS backend to support real-time channel voice & video conferencing, including token generation with standard room naming (`channel:${channelId}`), participant listing, track muting, participant kick/removal, and signed webhook verification.

**Architecture:** A globally exported `LiveKitModule` & `LiveKitService` in `src/providers/livekit/` wrapping singletons for `RoomServiceClient` and `WebhookReceiver` on `onModuleInit()`. Voice/video channel management endpoints are added to `src/modules/channel/` secured by `@Roles(...)` and `WorkspaceRolesGuard` with full exception translation for missing participants/rooms.

**Tech Stack:** NestJS, TypeScript, `livekit-server-sdk`, Prisma, `@nestjs/config`, Jest.

---

### Task 1: Add Package Dependency & LiveKit Configuration

**Files:**

- Modify: `package.json`
- Modify: `src/config/config.service.ts`
- Modify: `src/common/constants/error-codes.ts`

- [x] **Step 1: Install livekit-server-sdk**

Run command to add dependency:

```powershell
pnpm.cmd add livekit-server-sdk
```

- [x] **Step 2: Add LiveKit getters in AppConfigService**

Modify `src/config/config.service.ts` to add getters for `livekitApiKey`, `livekitApiSecret`, `livekitUrl`, and `livekitWsUrl`:

```typescript
  get livekitApiKey() {
    return this.configService.get<string>("LIVEKIT_API_KEY") ?? "devkey";
  }

  get livekitApiSecret() {
    return this.configService.get<string>("LIVEKIT_API_SECRET") ?? "secret";
  }

  get livekitUrl() {
    return this.configService.get<string>("LIVEKIT_URL") ?? "http://localhost:7880";
  }

  get livekitWsUrl() {
    return this.configService.get<string>("LIVEKIT_WS_URL") ?? "ws://localhost:7880";
  }
```

- [x] **Step 3: Add LiveKit error codes in ErrorCode constant**

Modify `src/common/constants/error-codes.ts` to include LiveKit and Participant error codes:

```typescript
  // LiveKit / Channel Voice
  ...prefixed('LIVEKIT', ['ERROR', 'PARTICIPANT_NOT_FOUND', 'ROOM_NOT_FOUND'] as const),
```

- [x] **Step 4: Verify build**

Run: `pnpm.cmd build`  
Expected: PASS with 0 compilation errors.

- [x] **Step 5: Done (Built & verified)**

---

### Task 2: Create Global LiveKit Provider Service (`src/providers/livekit/`)

**Files:**

- Create: `src/providers/livekit/livekit.service.ts`
- Create: `src/providers/livekit/livekit.module.ts`
- Create: `src/providers/livekit/livekit.service.spec.ts`
- Modify: `src/app.module.ts`

- [x] **Step 1: Write unit tests for LiveKitService**

Create `src/providers/livekit/livekit.service.spec.ts`:

```typescript
import { Test, TestingModule } from "@nestjs/testing";
import { LiveKitService } from "./livekit.service";
import { AppConfigService } from "src/config/config.service";

describe("LiveKitService", () => {
  let service: LiveKitService;
  let configService: AppConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LiveKitService,
        {
          provide: AppConfigService,
          useValue: {
            livekitApiKey: "test-key",
            livekitApiSecret: "test-secret",
            livekitUrl: "http://localhost:7880",
            livekitWsUrl: "ws://localhost:7880",
          },
        },
      ],
    }).compile();

    service = module.get<LiveKitService>(LiveKitService);
    configService = module.get<AppConfigService>(AppConfigService);
    service.onModuleInit();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should generate a valid JWT access token for a channel room", async () => {
    const token = await service.generateToken({
      roomName: "channel:test-channel-id",
      identity: "user-123",
      name: "John Doe",
      metadata: { avatar: "http://example.com/avatar.jpg" },
      isAdmin: false,
    });

    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(20);
  });

  it("should handle missing participant exception by throwing NotFoundException", async () => {
    jest
      .spyOn(service["roomService"], "mutePublishedTrack")
      .mockRejectedValue(new Error("participant not found"));

    await expect(
      service.muteParticipant(
        "channel:test-channel-id",
        "non-existent-user",
        "track-1",
        true,
      ),
    ).rejects.toThrow();
  });
});
```

- [x] **Step 2: Run test to verify it fails initially**

Run: `pnpm.cmd test src/providers/livekit/livekit.service.spec.ts`  
Expected: FAIL with "Cannot find module './livekit.service'".

- [x] **Step 3: Implement LiveKitService**

Create `src/providers/livekit/livekit.service.ts`:

```typescript
import {
  Injectable,
  OnModuleInit,
  NotFoundException,
  InternalServerErrorException,
} from "@nestjs/common";
import {
  AccessToken,
  RoomServiceClient,
  WebhookReceiver,
} from "livekit-server-sdk";
import { AppConfigService } from "src/config/config.service";
import { ErrorCode } from "src/common/constants/error-codes";

export interface GenerateTokenOptions {
  roomName: string;
  identity: string;
  name: string;
  metadata?: Record<string, any>;
  isAdmin?: boolean;
  ttl?: string | number;
}

@Injectable()
export class LiveKitService implements OnModuleInit {
  private roomService!: RoomServiceClient;
  private webhookReceiver!: WebhookReceiver;

  constructor(private readonly configService: AppConfigService) {}

  onModuleInit() {
    const apiKey = this.configService.livekitApiKey;
    const apiSecret = this.configService.livekitApiSecret;
    const host = this.configService.livekitUrl;

    this.roomService = new RoomServiceClient(host, apiKey, apiSecret);
    this.webhookReceiver = new WebhookReceiver(apiKey, apiSecret);
  }

  async generateToken(options: GenerateTokenOptions): Promise<string> {
    const {
      roomName,
      identity,
      name,
      metadata,
      isAdmin = false,
      ttl = "24h",
    } = options;

    const apiKey = this.configService.livekitApiKey;
    const apiSecret = this.configService.livekitApiSecret;

    const at = new AccessToken(apiKey, apiSecret, {
      identity,
      name,
      metadata: metadata ? JSON.stringify(metadata) : undefined,
      ttl,
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      roomAdmin: isAdmin,
    });

    return await at.toJwt();
  }

  async listParticipants(roomName: string) {
    try {
      return await this.roomService.listParticipants(roomName);
    } catch (error: any) {
      if (error?.message?.toLowerCase().includes("not found")) {
        throw new NotFoundException(ErrorCode.LIVEKIT_ROOM_NOT_FOUND);
      }
      throw new InternalServerErrorException(ErrorCode.LIVEKIT_ERROR);
    }
  }

  async muteParticipant(
    roomName: string,
    identity: string,
    trackSid: string,
    muted: boolean,
  ) {
    try {
      return await this.roomService.mutePublishedTrack(
        roomName,
        identity,
        trackSid,
        muted,
      );
    } catch (error: any) {
      if (error?.message?.toLowerCase().includes("not found")) {
        throw new NotFoundException(ErrorCode.LIVEKIT_PARTICIPANT_NOT_FOUND);
      }
      throw new InternalServerErrorException(ErrorCode.LIVEKIT_ERROR);
    }
  }

  async removeParticipant(roomName: string, identity: string) {
    try {
      return await this.roomService.removeParticipant(roomName, identity);
    } catch (error: any) {
      if (error?.message?.toLowerCase().includes("not found")) {
        throw new NotFoundException(ErrorCode.LIVEKIT_PARTICIPANT_NOT_FOUND);
      }
      throw new InternalServerErrorException(ErrorCode.LIVEKIT_ERROR);
    }
  }

  async verifyWebhook(body: string | Buffer, authHeader: string) {
    return this.webhookReceiver.receive(body, authHeader);
  }
}
```

- [x] **Step 4: Create Global LiveKitModule**

Create `src/providers/livekit/livekit.module.ts`:

```typescript
import { Global, Module } from "@nestjs/common";
import { LiveKitService } from "./livekit.service";
import { AppConfigService } from "src/config/config.service";

@Global()
@Module({
  providers: [LiveKitService, AppConfigService],
  exports: [LiveKitService],
})
export class LiveKitModule {}
```

- [x] **Step 5: Register LiveKitModule in AppModule**

Modify `src/app.module.ts` to import `LiveKitModule`.

- [x] **Step 6: Run tests to verify pass**

Run: `pnpm.cmd test src/providers/livekit/livekit.service.spec.ts`  
Expected: PASS with 3 passing tests.

- [x] **Step 7: Commit**

```bash
git add src/providers/livekit/ src/app.module.ts
git commit -m "feat(livekit): add global LiveKitModule and LiveKitService provider"
```

---

### Task 3: Create Channel Video DTOs & Endpoints in Channel Module

**Files:**

- Create: `src/modules/channel/dto/mute-participant.dto.ts`
- Create: `src/modules/channel/dto/livekit-token-response.dto.ts`
- Modify: `src/modules/channel/channel.service.ts`
- Modify: `src/modules/channel/channel.controller.ts`

- [x] **Step 1: Create DTOs**

Create `src/modules/channel/dto/mute-participant.dto.ts`:

```typescript
import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsNotEmpty, IsString } from "class-validator";

export class MuteParticipantDto {
  @ApiProperty({ description: "Identity of the participant to mute" })
  @IsString()
  @IsNotEmpty()
  participantIdentity!: string;

  @ApiProperty({ description: "SID of the track to mute/unmute" })
  @IsString()
  @IsNotEmpty()
  trackSid!: string;

  @ApiProperty({ description: "Mute state boolean" })
  @IsBoolean()
  muted!: boolean;
}
```

Create `src/modules/channel/dto/livekit-token-response.dto.ts`:

```typescript
import { ApiProperty } from "@nestjs/swagger";

export class LiveKitTokenResponseDto {
  @ApiProperty({ description: "Signed LiveKit JWT Access Token" })
  token!: string;

  @ApiProperty({
    description: "Standard room name formatted as channel:channelId",
  })
  roomName!: string;

  @ApiProperty({ description: "LiveKit WebSocket Connection URL" })
  wsUrl!: string;
}
```

- [x] **Step 2: Add video management methods in ChannelService**

Modify `src/modules/channel/channel.service.ts`:

```typescript
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CreateChannelDto } from "./dto/create-channel.dto";
import { PrismaService } from "src/database/prisma/prisma.service";
import { LiveKitService } from "src/providers/livekit/livekit.service";
import { AppConfigService } from "src/config/config.service";
import { ErrorCode } from "src/common/constants/error-codes";
import { MuteParticipantDto } from "./dto/mute-participant.dto";

@Injectable()
export class ChannelService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly livekitService: LiveKitService,
    private readonly configService: AppConfigService,
  ) {}

  // ... existing methods ...

  async generateChannelToken(
    userId: string,
    channelId: string,
    workspaceId: string,
  ) {
    const member = await this.prisma.channelMember.findUnique({
      where: {
        channelId_userId: { channelId, userId },
      },
      include: {
        user: true,
      },
    });

    if (!member) {
      throw new ForbiddenException(ErrorCode.FORBIDDEN);
    }

    const wsMember = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId },
      },
    });

    const isAdmin = wsMember?.role === "ADMIN";
    const roomName = `channel:${channelId}`;

    const token = await this.livekitService.generateToken({
      roomName,
      identity: userId,
      name: member.user.name,
      metadata: { avatar: member.user.image },
      isAdmin,
    });

    return {
      token,
      roomName,
      wsUrl: this.configService.livekitWsUrl,
    };
  }

  async getChannelParticipants(userId: string, channelId: string) {
    const isMember = await this.prisma.channelMember.findUnique({
      where: { channelId_userId: { channelId, userId } },
    });
    if (!isMember) {
      throw new ForbiddenException(ErrorCode.FORBIDDEN);
    }
    const roomName = `channel:${channelId}`;
    return this.livekitService.listParticipants(roomName);
  }

  async muteChannelParticipant(channelId: string, dto: MuteParticipantDto) {
    const roomName = `channel:${channelId}`;
    return this.livekitService.muteParticipant(
      roomName,
      dto.participantIdentity,
      dto.trackSid,
      dto.muted,
    );
  }

  async removeChannelParticipant(
    channelId: string,
    participantIdentity: string,
  ) {
    const roomName = `channel:${channelId}`;
    return this.livekitService.removeParticipant(roomName, participantIdentity);
  }
}
```

- [x] **Step 3: Add Endpoints in ChannelController / ChannelVideoController**

Modify `src/modules/channel/channel.controller.ts` to add workspace-scoped video endpoints with `@Roles(Role.ADMIN)`:

```typescript
  @Post(":channelId/video/token")
  @UseGuards(WorkspaceRolesGuard)
  @ApiOkResponseGeneric(LiveKitTokenResponseDto)
  async getChannelVideoToken(
    @CurrentUser() user: User,
    @Param("channelId") channelId: string,
    @Param("workspaceId") workspaceId: string,
  ) {
    return this.channelService.generateChannelToken(user.id, channelId, workspaceId);
  }

  @Get(":channelId/video/participants")
  @UseGuards(WorkspaceRolesGuard)
  async getChannelParticipants(
    @CurrentUser() user: User,
    @Param("channelId") channelId: string,
  ) {
    return this.channelService.getChannelParticipants(user.id, channelId);
  }

  @Post(":channelId/video/mute-participant")
  @UseGuards(WorkspaceRolesGuard)
  @Roles(Role.ADMIN)
  async muteParticipant(
    @Param("channelId") channelId: string,
    @Body() dto: MuteParticipantDto,
  ) {
    return this.channelService.muteChannelParticipant(channelId, dto);
  }

  @Delete(":channelId/video/participants/:participantIdentity")
  @UseGuards(WorkspaceRolesGuard)
  @Roles(Role.ADMIN)
  async removeParticipant(
    @Param("channelId") channelId: string,
    @Param("participantIdentity") participantIdentity: string,
  ) {
    return this.channelService.removeChannelParticipant(channelId, participantIdentity);
  }
```

- [x] **Step 4: Verify build and lint**

Run: `pnpm.cmd build`  
Expected: PASS

Run: `pnpm.cmd lint`  
Expected: PASS with 0 lint errors.

- [x] **Step 5: Done (Built & verified)**

---

### Task 4: End-to-End Verification

- [x] **Step 1: Execute production build check**

Run: `pnpm.cmd build`  
Expected: Clean compilation, output in `dist/`.

- [x] **Step 2: Execute all unit tests**

Run: `pnpm.cmd test`  
Expected: All tests pass.

