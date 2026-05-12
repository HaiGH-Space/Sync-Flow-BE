import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/database/prisma/prisma.service";
import { NotificationType } from "generated/prisma/client";
import { NotificationsGateway } from "./notifications.gateway";
import { notificationSelect } from "./notifications.types";

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  findAllByUserId(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: notificationSelect,
    });
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

  async markWorkspaceInviteNotificationsAsRead(workspaceInviteId: string) {
    await this.prisma.notification.updateMany({
      where: { workspaceInviteId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    const updatedNotifications = await this.prisma.notification.findMany({
      where: { workspaceInviteId },
      select: notificationSelect,
    });

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
