import { Test, TestingModule } from "@nestjs/testing";
import { WorkspaceService } from "./workspace.service";
import { PrismaService } from "src/database/prisma/prisma.service";
import { NotificationsService } from "src/modules/notifications/notifications.service";
import { AppConfigService } from "src/config/config.service";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { ErrorCode } from "src/common/constants/error-codes";
import { Role } from "generated/prisma/enums";

describe("WorkspaceService", () => {
  let service: WorkspaceService;

  const mockPrismaService = {
    workspaceMember: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    workspaceInvite: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
    },
    workspace: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockNotificationsService = {
    createWorkspaceInviteNotification: jest.fn().mockResolvedValue({ id: "notif-123" }),
    markWorkspaceInviteNotificationsAsRead: jest.fn().mockResolvedValue([]),
  };

  const mockConfigService = {
    defaultInviteExpiresInDays: 7,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspaceService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: AppConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<WorkspaceService>(WorkspaceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("inviteMember", () => {
    it("should throw ConflictException if the user is already a workspace member", async () => {
      mockPrismaService.workspaceMember.findFirst.mockResolvedValue({ id: "member-123" });

      await expect(
        service.inviteMember("inviter-1", "workspace-1", "member@example.com")
      ).rejects.toThrow(
        new ConflictException(ErrorCode.USER_ALREADY_MEMBER)
      );

      expect(mockPrismaService.workspaceMember.findFirst).toHaveBeenCalledWith({
        where: {
          workspaceId: "workspace-1",
          user: { email: "member@example.com" },
        },
      });
    });

    it("should upsert workspace invite and trigger notification on success", async () => {
      mockPrismaService.workspaceMember.findFirst.mockResolvedValue(null);
      mockPrismaService.workspaceInvite.upsert.mockResolvedValue({
        id: "invite-123",
        workspaceId: "workspace-1",
        email: "member@example.com",
        token: "random_token",
        expiresAt: new Date(),
        role: "MEMBER",
        inviterId: "inviter-1",
      });

      const result = await service.inviteMember(
        "inviter-1",
        "workspace-1",
        "member@example.com",
        Role.MEMBER
      );

      expect(result).toEqual({ status: true });
      expect(mockPrismaService.workspaceInvite.upsert).toHaveBeenCalledWith({
        where: {
          workspaceId_email: {
            workspaceId: "workspace-1",
            email: "member@example.com",
          },
        },
        update: {
          token: expect.any(String),
          expiresAt: expect.any(Date),
          role: "MEMBER",
          inviterId: "inviter-1",
        },
        create: {
          workspaceId: "workspace-1",
          email: "member@example.com",
          token: expect.any(String),
          expiresAt: expect.any(Date),
          role: "MEMBER",
          inviterId: "inviter-1",
        },
      });
      expect(mockNotificationsService.createWorkspaceInviteNotification).toHaveBeenCalledWith("invite-123");
    });
  });
});
