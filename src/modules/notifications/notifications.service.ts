import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/database/prisma/prisma.service";
import { NotificationType } from "generated/prisma/client";
import { NotificationsGateway } from "./notifications.gateway";
import { notificationSelect } from "./types/notification.types";

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  findAllByUserId(userId: string, page?: number, limit?: number) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      ...(page !== undefined && limit !== undefined
        ? {
            skip: (page - 1) * limit,
            take: limit,
          }
        : {}),
      select: notificationSelect,
    });
  }

  async countUnreadByUserId(userId: string) {
    const count = await this.prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });

    return { count };
  }

  async markAsRead(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException("NOT_FOUND");
    }

    const updatedNotification = await this.prisma.notification.update({
      where: { id: notificationId },
      select: notificationSelect,
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    this.notificationsGateway.emitNotificationUpdated(
      updatedNotification.userId,
      updatedNotification,
    );

    return updatedNotification;
  }

  async markAllAsRead(userId: string) {
    const unreadNotifications = await this.prisma.notification.findMany({
      where: {
        userId,
        isRead: false,
      },
      select: notificationSelect,
    });

    if (unreadNotifications.length === 0) {
      return [];
    }

    const readAt = new Date();
    const updatedNotifications = await this.prisma.$transaction(
      unreadNotifications.map((notification) =>
        this.prisma.notification.update({
          where: { id: notification.id },
          select: notificationSelect,
          data: {
            isRead: true,
            readAt,
          },
        }),
      ),
    );

    for (const notification of updatedNotifications) {
      this.notificationsGateway.emitNotificationUpdated(
        notification.userId,
        notification,
      );
    }

    return updatedNotifications;
  }

  async markWorkspaceInviteNotificationsAsRead(workspaceInviteId: string) {
    const unreadNotifications = await this.prisma.notification.findMany({
      where: {
        workspaceInviteId,
        isRead: false,
      },
      select: notificationSelect,
    });

    if (unreadNotifications.length === 0) {
      return [];
    }

    const readAt = new Date();
    const updatedNotifications = await this.prisma.$transaction(
      unreadNotifications.map((notification) =>
        this.prisma.notification.update({
          where: { id: notification.id },
          select: notificationSelect,
          data: {
            isRead: true,
            readAt,
          },
        }),
      ),
    );

    for (const notification of updatedNotifications) {
      this.notificationsGateway.emitNotificationUpdated(
        notification.userId,
        notification,
      );
    }

    return updatedNotifications;
  }

  async createWorkspaceInviteNotification(workspaceInviteId: string) {
    const invite = await this.prisma.workspaceInvite.findUnique({
      where: { id: workspaceInviteId },
      include: {
        workspace: true,
        inviter: true,
      },
    });

    if (!invite) {
      throw new NotFoundException("NOT_FOUND");
    }

    const recipient = await this.prisma.user.findUnique({
      where: { email: invite.email },
    });

    if (!recipient) {
      return null;
    }

    const notification = await this.prisma.notification.upsert({
      where: {
        userId_workspaceInviteId: {
          userId: recipient.id,
          workspaceInviteId: invite.id,
        },
      },
      update: {
        type: NotificationType.WORKSPACE_INVITE,
        title: `You were invited to ${invite.workspace.name}`,
        message: `${invite.inviter.name} invited you to join ${invite.workspace.name} as ${invite.role.toLowerCase()}.`,
      },
      create: {
        userId: recipient.id,
        workspaceInviteId: invite.id,
        type: NotificationType.WORKSPACE_INVITE,
        title: `You were invited to ${invite.workspace.name}`,
        message: `${invite.inviter.name} invited you to join ${invite.workspace.name} as ${invite.role.toLowerCase()}.`,
      },
      select: notificationSelect,
    });

    this.notificationsGateway.emitNotificationCreated(
      notification.userId,
      notification,
    );

    return notification;
  }
}
