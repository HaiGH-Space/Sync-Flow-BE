import { Test, TestingModule } from "@nestjs/testing";
import { ForbiddenException } from "@nestjs/common";
import { ChannelService } from "./channel.service";
import { PrismaService } from "src/database/prisma/prisma.service";
import { LiveKitService } from "src/providers/livekit/livekit.service";
import { AppConfigService } from "src/config/config.service";
import { Role } from "generated/prisma/client";

describe("ChannelService", () => {
  let service: ChannelService;
  let prisma: any;
  let livekitService: any;
  let configService: any;

  beforeEach(async () => {
    prisma = {
      channel: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      channelMember: {
        findUnique: jest.fn(),
      },
      workspaceMember: {
        findUnique: jest.fn(),
      },
    };

    livekitService = {
      generateToken: jest.fn(),
      listParticipants: jest.fn(),
      muteParticipant: jest.fn(),
      removeParticipant: jest.fn(),
    };

    configService = {
      livekitWsUrl: "ws://localhost:7880",
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChannelService,
        { provide: PrismaService, useValue: prisma },
        { provide: LiveKitService, useValue: livekitService },
        { provide: AppConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<ChannelService>(ChannelService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("generateChannelToken", () => {
    it("should generate a channel video token for a valid member", async () => {
      prisma.channelMember.findUnique.mockResolvedValue({
        channelId: "channel-1",
        userId: "user-1",
        user: { name: "Alice", image: "avatar.png" },
      });
      prisma.workspaceMember.findUnique.mockResolvedValue({
        workspaceId: "ws-1",
        userId: "user-1",
        role: Role.ADMIN,
      });
      livekitService.generateToken.mockResolvedValue("mock-jwt-token");

      const result = await service.generateChannelToken(
        "user-1",
        "channel-1",
        "ws-1",
      );

      expect(result).toEqual({
        token: "mock-jwt-token",
        roomName: "channel:channel-1",
        wsUrl: "ws://localhost:7880",
      });
      expect(livekitService.generateToken).toHaveBeenCalledWith({
        roomName: "channel:channel-1",
        identity: "user-1",
        name: "Alice",
        metadata: { avatar: "avatar.png" },
        isAdmin: true,
      });
    });

    it("should throw ForbiddenException if user is not a channel member", async () => {
      prisma.channelMember.findUnique.mockResolvedValue(null);

      await expect(
        service.generateChannelToken("user-1", "channel-1", "ws-1"),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("getChannelParticipants", () => {
    it("should return participant list for channel member", async () => {
      prisma.channelMember.findUnique.mockResolvedValue({
        channelId: "channel-1",
        userId: "user-1",
      });
      const mockParticipants = [{ identity: "user-1" }];
      livekitService.listParticipants.mockResolvedValue(mockParticipants);

      const result = await service.getChannelParticipants(
        "user-1",
        "channel-1",
      );
      expect(result).toEqual(mockParticipants);
      expect(livekitService.listParticipants).toHaveBeenCalledWith(
        "channel:channel-1",
      );
    });

    it("should throw ForbiddenException if not a member", async () => {
      prisma.channelMember.findUnique.mockResolvedValue(null);

      await expect(
        service.getChannelParticipants("user-1", "channel-1"),
      ).rejects.toThrow(ForbiddenException);
    });
  });

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
      expect(livekitService.muteParticipant).toHaveBeenCalledWith(
        "channel:channel-1",
        "user-2",
        "TR_123",
        true,
      );
    });

    it("should throw ForbiddenException if channel does not belong to workspace", async () => {
      prisma.channel.findFirst.mockResolvedValue(null);

      await expect(
        service.muteChannelParticipant("ws-1", "channel-1", {
          participantIdentity: "user-2",
          trackSid: "TR_123",
          muted: true,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("removeChannelParticipant", () => {
    it("should call livekitService.removeParticipant if channel belongs to workspace", async () => {
      prisma.channel.findFirst.mockResolvedValue({ id: "channel-1" });
      livekitService.removeParticipant.mockResolvedValue({ success: true });

      const result = await service.removeChannelParticipant(
        "ws-1",
        "channel-1",
        "user-2",
      );

      expect(result).toEqual({ success: true });
      expect(prisma.channel.findFirst).toHaveBeenCalledWith({
        where: { id: "channel-1", project: { workspaceId: "ws-1" } },
      });
      expect(livekitService.removeParticipant).toHaveBeenCalledWith(
        "channel:channel-1",
        "user-2",
      );
    });

    it("should throw ForbiddenException if channel does not belong to workspace", async () => {
      prisma.channel.findFirst.mockResolvedValue(null);

      await expect(
        service.removeChannelParticipant("ws-1", "channel-1", "user-2"),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
