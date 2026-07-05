/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return */
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
    user: {
      findUnique: jest.fn(),
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
        role: Role.MEMBER,
        inviterId: "inviter-1",
      });
      mockPrismaService.workspace.findUnique.mockResolvedValue({ id: "workspace-1", name: "Workspace 1" });
      mockPrismaService.user.findUnique.mockImplementation((args: { where: { id?: string; email?: string } }) => {
        if (args.where.id === "inviter-1") return { id: "inviter-1", name: "Inviter 1" };
        if (args.where.email === "member@example.com") return { id: "recipient-1", email: "member@example.com" };
        return null;
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
          token: expect.any(String) as unknown as string,
          expiresAt: expect.any(Date) as unknown as Date,
          role: "MEMBER",
          inviterId: "inviter-1",
        },
        create: {
          workspaceId: "workspace-1",
          email: "member@example.com",
          token: expect.any(String) as unknown as string,
          expiresAt: expect.any(Date) as unknown as Date,
          role: "MEMBER",
          inviterId: "inviter-1",
        },
      });
      expect(mockNotificationsService.createWorkspaceInviteNotification).toHaveBeenCalledWith(
        "recipient-1",
        "invite-123",
        "Workspace 1",
        "Inviter 1",
        Role.MEMBER,
      );
    });

    it("should use custom expiresInDays if provided", async () => {
      mockPrismaService.workspaceMember.findFirst.mockResolvedValue(null);
      mockPrismaService.workspaceInvite.upsert.mockResolvedValue({
        id: "invite-123",
        workspaceId: "workspace-1",
        email: "member@example.com",
        token: "random_token",
        expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        role: Role.MEMBER,
        inviterId: "inviter-1",
      });
      mockPrismaService.workspace.findUnique.mockResolvedValue({ id: "workspace-1", name: "Workspace 1" });
      mockPrismaService.user.findUnique.mockImplementation((args: { where: { id?: string; email?: string } }) => {
        if (args.where.id === "inviter-1") return { id: "inviter-1", name: "Inviter 1" };
        if (args.where.email === "member@example.com") return { id: "recipient-1", email: "member@example.com" };
        return null;
      });

      await service.inviteMember(
        "inviter-1",
        "workspace-1",
        "member@example.com",
        Role.MEMBER,
        3 // custom expiresInDays
      );

      expect(mockPrismaService.workspaceInvite.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            expiresAt: expect.any(Date) as unknown as Date,
          }),
        })
      );
      expect(mockNotificationsService.createWorkspaceInviteNotification).toHaveBeenCalledWith(
        "recipient-1",
        "invite-123",
        "Workspace 1",
        "Inviter 1",
        Role.MEMBER,
      );
    });
  });


  describe("acceptInvite", () => {
    it("should throw NotFoundException if invite token is invalid", async () => {
      mockPrismaService.workspaceInvite.findUnique.mockResolvedValue(null);

      await expect(
        service.acceptInvite("user-123", "invalid-token")
      ).rejects.toThrow(
        new NotFoundException(ErrorCode.INVALID_INVITE)
      );
    });

    it("should throw NotFoundException if invite token is expired", async () => {
      const pastDate = new Date();
      pastDate.setMinutes(pastDate.getMinutes() - 10);
      mockPrismaService.workspaceInvite.findUnique.mockResolvedValue({
        token: "expired-token",
        expiresAt: pastDate,
      });

      await expect(
        service.acceptInvite("user-123", "expired-token")
      ).rejects.toThrow(
        new NotFoundException(ErrorCode.EXPIRED_INVITE)
      );
    });

    it("should rollback transaction and throw error if deleting the invite fails", async () => {
      const futureDate = new Date();
      futureDate.setMinutes(futureDate.getMinutes() + 10);
      mockPrismaService.workspaceInvite.findUnique.mockResolvedValue({
        workspaceId: "workspace-1",
        role: Role.MEMBER,
        token: "token-abc",
        expiresAt: futureDate,
      });

      mockPrismaService.$transaction.mockImplementation(
        async (callback: (tx: any) => Promise<any>) => {
          return await callback(mockPrismaService);
        }
      );

      mockPrismaService.workspaceMember.create.mockResolvedValue({ id: "member-123" });
      mockPrismaService.workspaceInvite.delete.mockRejectedValue(new Error("Delete invite failed"));

      await expect(
        service.acceptInvite("user-123", "token-abc")
      ).rejects.toThrow("Delete invite failed");

      expect(mockPrismaService.workspaceMember.create).toHaveBeenCalled();
    });

    it("should create workspace member, delete invite, mark notification as read on success", async () => {
      const futureDate = new Date();
      futureDate.setMinutes(futureDate.getMinutes() + 10);
      const mockInvite = {
        id: "invite-123",
        workspaceId: "workspace-1",
        role: Role.MEMBER,
        token: "token-abc",
        expiresAt: futureDate,
      };
      mockPrismaService.workspaceInvite.findUnique.mockResolvedValue(mockInvite);

      mockPrismaService.$transaction.mockImplementation(
        async (callback: (tx: any) => Promise<any>) => {
          return await callback(mockPrismaService);
        }
      );

      mockPrismaService.workspaceMember.create.mockResolvedValue({ id: "member-123" });
      mockPrismaService.workspaceInvite.delete.mockResolvedValue(mockInvite);

      const result = await service.acceptInvite("user-123", "token-abc");

      expect(result).toEqual({ status: true });
      expect(mockPrismaService.workspaceMember.create).toHaveBeenCalledWith({
        data: {
          workspaceId: "workspace-1",
          userId: "user-123",
          role: Role.MEMBER,
        },
      });
      expect(mockPrismaService.workspaceInvite.delete).toHaveBeenCalledWith({
        where: { token: "token-abc" },
      });
      expect(mockNotificationsService.markWorkspaceInviteNotificationsAsRead).toHaveBeenCalledWith("invite-123");
    });
  });

  describe("findAllByUserId", () => {
    it("should return workspaces where user is a member", async () => {
      const mockWorkspaces = [{ id: "ws-1", name: "Workspace 1" }];
      mockPrismaService.workspace.findMany.mockResolvedValue(mockWorkspaces);
      mockPrismaService.workspace.count.mockResolvedValue(1);

      const result = await service.findAllByUserId("user-123", { page: 1, limit: 20 });

      expect(result).toEqual({
        items: mockWorkspaces,
        total: 1,
        page: 1,
        limit: 20,
      });
      expect(mockPrismaService.workspace.findMany).toHaveBeenCalledWith({
        where: {
          members: {
            some: { userId: "user-123" },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: 0,
        take: 20,
      });
      expect(mockPrismaService.workspace.count).toHaveBeenCalledWith({
        where: {
          members: {
            some: { userId: "user-123" },
          },
        },
      });
    });
  });

  describe("create", () => {
    it("should throw ConflictException if workspace url slug already exists", async () => {
      mockPrismaService.workspace.findUnique.mockResolvedValue({ id: "ws-1" });

      await expect(
        service.create("user-123", { name: "New Ws", urlSlug: "duplicate-slug" })
      ).rejects.toThrow(
        new ConflictException(ErrorCode.WORKSPACE_SLUG_EXISTS)
      );
    });

    it("should create workspace and admin membership on success", async () => {
      mockPrismaService.workspace.findUnique.mockResolvedValue(null);
      const mockCreatedWorkspace = { id: "ws-1", name: "New Ws", urlSlug: "new-ws" };
      mockPrismaService.workspace.create.mockResolvedValue(mockCreatedWorkspace);

      const result = await service.create("user-123", { name: "New Ws", urlSlug: "new-ws" });

      expect(result).toEqual(mockCreatedWorkspace);
      expect(mockPrismaService.workspace.create).toHaveBeenCalledWith({
        data: {
          name: "New Ws",
          urlSlug: "new-ws",
          ownerId: "user-123",
          members: {
            create: {
              userId: "user-123",
              role: Role.ADMIN,
            },
          },
        },
        include: { members: true },
      });
    });
  });

  describe("update", () => {
    it("should throw ConflictException if update slug belongs to another workspace", async () => {
      mockPrismaService.workspace.findUnique.mockResolvedValue({ id: "ws-other", urlSlug: "taken-slug" });

      await expect(
        service.update("ws-1", { urlSlug: "taken-slug" })
      ).rejects.toThrow(
        new ConflictException(ErrorCode.WORKSPACE_SLUG_EXISTS)
      );
    });

    it("should update workspace if slug does not conflict", async () => {
      mockPrismaService.workspace.findUnique.mockResolvedValue(null);
      const mockUpdated = { id: "ws-1", name: "Updated Ws" };
      mockPrismaService.workspace.update.mockResolvedValue(mockUpdated);

      const result = await service.update("ws-1", { name: "Updated Ws" });

      expect(result).toEqual(mockUpdated);
      expect(mockPrismaService.workspace.update).toHaveBeenCalledWith({
        where: { id: "ws-1" },
        data: { name: "Updated Ws" },
      });
    });
  });

  describe("delete", () => {
    it("should call delete workspace", async () => {
      mockPrismaService.workspace.delete.mockResolvedValue({ id: "ws-1" });

      await service.delete("ws-1");

      expect(mockPrismaService.workspace.delete).toHaveBeenCalledWith({
        where: { id: "ws-1" },
      });
    });
  });
});
