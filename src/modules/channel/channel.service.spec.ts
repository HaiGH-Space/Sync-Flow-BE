import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { ChannelService } from "./channel.service";
import { PrismaService } from "src/database/prisma/prisma.service";
import { LiveKitService } from "src/providers/livekit/livekit.service";
import { AppConfigService } from "src/config/config.service";
import { ChannelType, ChannelVisibility, Role } from "generated/prisma/client";

describe("ChannelService", () => {
  let service: ChannelService;
  let prisma: any;
  let livekitService: any;
  let configService: any;

  beforeEach(async () => {
    prisma = {
      project: {
        findUnique: jest.fn(),
      },
      channel: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
      },
      channelMember: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
      workspaceMember: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      user: {
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

  describe("hasChannelAccess", () => {
    it("should return false if user is not a workspace member even if ChannelMember exists", async () => {
      prisma.channel.findUnique.mockResolvedValue({
        id: "channel-1",
        visibility: ChannelVisibility.PRIVATE,
        project: { workspaceId: "ws-1" },
      });
      prisma.workspaceMember.findUnique.mockResolvedValue(null);

      const access = await service.hasChannelAccess("user-1", "channel-1");
      expect(access).toBe(false);
    });

    it("should return true for public channel if workspace member", async () => {
      prisma.channel.findUnique.mockResolvedValue({
        id: "channel-1",
        visibility: ChannelVisibility.PUBLIC,
        project: { workspaceId: "ws-1" },
      });
      prisma.workspaceMember.findUnique.mockResolvedValue({
        workspaceId: "ws-1",
        userId: "user-1",
      });

      const access = await service.hasChannelAccess("user-1", "channel-1");
      expect(access).toBe(true);
    });
  });

  describe("create", () => {
    it("should throw NotFoundException if project does not exist", async () => {
      prisma.project.findUnique.mockResolvedValue(null);

      await expect(
        service.create("user-1", { name: "Test", type: ChannelType.GROUP }, "p-1"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException if any memberId is not a workspace member", async () => {
      prisma.project.findUnique.mockResolvedValue({ workspaceId: "ws-1" });
      prisma.workspaceMember.findMany.mockResolvedValue([{ userId: "user-1" }]); // missing user-2

      await expect(
        service.create(
          "user-1",
          { name: "Test", type: ChannelType.GROUP, memberIds: ["user-2"] },
          "p-1",
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("should force visibility to PRIVATE for DIRECT channels even if PUBLIC is requested", async () => {
      prisma.project.findUnique.mockResolvedValue({ workspaceId: "ws-1" });
      prisma.channel.findFirst.mockResolvedValue(null);
      prisma.workspaceMember.findMany.mockResolvedValue([
        { userId: "user-1" },
        { userId: "user-2" },
      ]);
      prisma.channel.create.mockResolvedValue({ id: "c-1" });

      await service.create(
        "user-1",
        {
          type: ChannelType.DIRECT,
          visibility: ChannelVisibility.PUBLIC,
          memberIds: ["user-2"],
        },
        "p-1",
      );

      expect(prisma.channel.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: ChannelType.DIRECT,
          visibility: ChannelVisibility.PRIVATE,
        }),
        include: { members: true },
      });
    });

    it("should throw BadRequestException for DIRECT channel without exactly 1 target recipient", async () => {
      prisma.project.findUnique.mockResolvedValue({ workspaceId: "ws-1" });

      await expect(
        service.create(
          "user-1",
          { type: ChannelType.DIRECT, memberIds: [] },
          "p-1",
        ),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.create(
          "user-1",
          { type: ChannelType.DIRECT, memberIds: ["user-2", "user-3"] },
          "p-1",
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("should return existing DM channel if DIRECT channel already exists", async () => {
      const mockExistingDm = { id: "c-existing", type: ChannelType.DIRECT };
      prisma.project.findUnique.mockResolvedValue({ workspaceId: "ws-1" });
      prisma.channel.findFirst.mockResolvedValue(mockExistingDm);

      const result = await service.create(
        "user-1",
        { type: ChannelType.DIRECT, memberIds: ["user-2"] },
        "p-1",
      );

      expect(result).toBe(mockExistingDm);
      expect(prisma.channel.create).not.toHaveBeenCalled();
    });
  });

  describe("generateChannelToken", () => {
    it("should generate a channel video token for a valid member", async () => {
      prisma.channel.findUnique.mockResolvedValue({
        id: "channel-1",
        visibility: ChannelVisibility.PRIVATE,
        project: { workspaceId: "ws-1" },
        members: [{ id: "cm-1" }],
      });
      prisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        name: "Alice",
        email: "alice@example.com",
        image: "avatar.png",
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
    });

    it("should throw ForbiddenException if workspaceId in URL does not match channel project workspaceId", async () => {
      prisma.channel.findUnique.mockResolvedValue({
        id: "channel-1",
        visibility: ChannelVisibility.PUBLIC,
        project: { workspaceId: "ws-actual" },
      });
      prisma.user.findUnique.mockResolvedValue({ id: "user-1" });
      prisma.workspaceMember.findUnique.mockResolvedValue({
        workspaceId: "ws-attacker",
        userId: "user-1",
      });

      await expect(
        service.generateChannelToken("user-1", "channel-1", "ws-attacker"),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should throw ForbiddenException if user is not a channel member", async () => {
      prisma.channel.findUnique.mockResolvedValue({
        id: "channel-1",
        visibility: ChannelVisibility.PRIVATE,
        project: { workspaceId: "ws-1" },
        members: [],
      });
      prisma.user.findUnique.mockResolvedValue({ id: "user-1" });
      prisma.workspaceMember.findUnique.mockResolvedValue({
        workspaceId: "ws-1",
        userId: "user-1",
      });

      await expect(
        service.generateChannelToken("user-1", "channel-1", "ws-1"),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("getChannelParticipants", () => {
    it("should return participant list for channel member", async () => {
      prisma.channel.findUnique.mockResolvedValue({
        id: "channel-1",
        visibility: ChannelVisibility.PUBLIC,
        project: { workspaceId: "ws-1" },
      });
      prisma.workspaceMember.findUnique.mockResolvedValue({
        workspaceId: "ws-1",
        userId: "user-1",
      });
      const mockParticipants = [{ identity: "user-1" }];
      livekitService.listParticipants.mockResolvedValue(mockParticipants);

      const result = await service.getChannelParticipants(
        "user-1",
        "channel-1",
      );
      expect(result).toEqual(mockParticipants);
    });

    it("should throw ForbiddenException if not a member", async () => {
      prisma.channel.findUnique.mockResolvedValue(null);

      await expect(
        service.getChannelParticipants("user-1", "channel-1"),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("updateLastReadAt", () => {
    it("should upsert channel member lastReadAt if user has access", async () => {
      prisma.channel.findUnique.mockResolvedValue({
        id: "channel-1",
        visibility: ChannelVisibility.PUBLIC,
        project: { workspaceId: "ws-1" },
      });
      prisma.workspaceMember.findUnique.mockResolvedValue({
        workspaceId: "ws-1",
        userId: "user-1",
      });
      prisma.channelMember.upsert.mockResolvedValue({
        channelId: "channel-1",
        userId: "user-1",
        lastReadAt: new Date(),
      });

      const result = await service.updateLastReadAt("user-1", "channel-1");
      expect(result).toBeDefined();
      expect(prisma.channelMember.upsert).toHaveBeenCalledWith({
        where: { channelId_userId: { channelId: "channel-1", userId: "user-1" } },
        update: { lastReadAt: expect.any(Date) },
        create: { channelId: "channel-1", userId: "user-1", lastReadAt: expect.any(Date) },
      });
    });

    it("should throw ForbiddenException if user has no access", async () => {
      prisma.channel.findUnique.mockResolvedValue(null);

      await expect(service.updateLastReadAt("user-1", "channel-1")).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
