import { Test, TestingModule } from "@nestjs/testing";
import { NotificationsService } from "./notifications.service";
import { PrismaService } from "src/database/prisma/prisma.service";
import { NotificationsGateway } from "./notifications.gateway";
import { NotFoundException } from "@nestjs/common";
import { NotificationType } from "generated/prisma/client";
import { notificationSelect } from "./types/notification.types";

describe("NotificationsService", () => {
  let service: NotificationsService;

  const mockPrismaService = {
    notification: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    workspaceInvite: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockNotificationsGateway = {
    emitNotificationUpdated: jest.fn(),
    emitNotificationCreated: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: NotificationsGateway, useValue: mockNotificationsGateway },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("findAllByUserId", () => {
    it("should query findMany with pagination parameters if provided", async () => {
      mockPrismaService.notification.findMany.mockResolvedValue([]);

      await service.findAllByUserId("user-123", 2, 10);

      expect(mockPrismaService.notification.findMany).toHaveBeenCalledWith({
        where: { userId: "user-123" },
        orderBy: { createdAt: "desc" },
        skip: 10,
        take: 10,
        select: notificationSelect,
      });
    });

    it("should query findMany without pagination parameters if not provided", async () => {
      mockPrismaService.notification.findMany.mockResolvedValue([]);

      await service.findAllByUserId("user-123");

      expect(mockPrismaService.notification.findMany).toHaveBeenCalledWith({
        where: { userId: "user-123" },
        orderBy: { createdAt: "desc" },
        select: notificationSelect,
      });
    });
  });

  describe("countUnreadByUserId", () => {
    it("should return count of unread notifications", async () => {
      mockPrismaService.notification.count.mockResolvedValue(5);

      const result = await service.countUnreadByUserId("user-123");

      expect(result).toEqual({ count: 5 });
      expect(mockPrismaService.notification.count).toHaveBeenCalledWith({
        where: { userId: "user-123", isRead: false },
      });
    });
  });

  describe("markAsRead", () => {
    it("should throw NotFoundException if notification is not found for the user (security check)", async () => {
      mockPrismaService.notification.findFirst.mockResolvedValue(null);

      await expect(
        service.markAsRead("notif-1", "user-123")
      ).rejects.toThrow(new NotFoundException("NOT_FOUND"));

      expect(mockPrismaService.notification.findFirst).toHaveBeenCalledWith({
        where: { id: "notif-1", userId: "user-123" },
      });
    });

    it("should mark notification as read and emit updated event on success", async () => {
      const mockNotif = { id: "notif-1", userId: "user-123", isRead: false };
      const mockUpdated = { id: "notif-1", userId: "user-123", isRead: true };
      mockPrismaService.notification.findFirst.mockResolvedValue(mockNotif);
      mockPrismaService.notification.update.mockResolvedValue(mockUpdated);

      const result = await service.markAsRead("notif-1", "user-123");

      expect(result).toEqual(mockUpdated);
      expect(mockPrismaService.notification.update).toHaveBeenCalledWith({
        where: { id: "notif-1" },
        select: notificationSelect,
        data: {
          isRead: true,
          readAt: expect.any(Date),
        },
      });
      expect(mockNotificationsGateway.emitNotificationUpdated).toHaveBeenCalledWith("user-123", mockUpdated);
    });
  });

  describe("markAllAsRead", () => {
    it("should return early with empty array if there are no unread notifications", async () => {
      mockPrismaService.notification.findMany.mockResolvedValue([]);

      const result = await service.markAllAsRead("user-123");

      expect(result).toEqual([]);
      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
    });

    it("should update all unread notifications in transaction and emit gateway updates", async () => {
      const unreadList = [
        { id: "n-1", userId: "user-123" },
        { id: "n-2", userId: "user-123" },
      ];
      mockPrismaService.notification.findMany.mockResolvedValue(unreadList);
      mockPrismaService.$transaction.mockResolvedValue([
        { id: "n-1", userId: "user-123", isRead: true },
        { id: "n-2", userId: "user-123", isRead: true },
      ]);

      const result = await service.markAllAsRead("user-123");

      expect(result.length).toBe(2);
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(mockNotificationsGateway.emitNotificationUpdated).toHaveBeenCalledTimes(2);
    });
  });
});
