import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/database/prisma/prisma.service";
import { NotificationType } from "generated/prisma/client";

const notificationSelect = {
  id: true,
  userId: true,
  workspaceInviteId: true,
  type: true,
  title: true,
  message: true,
  workspaceInvite: {
    select: {
      id: true,
      workspaceId: true,
      inviterId: true,
      email: true,
      role: true,
      token: true,
      expiresAt: true,
      createdAt: true,
      workspace: true,
      inviter: true,
    },
  },
  isRead: true,
  readAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

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

    return this.prisma.notification.update({
      where: { id: notificationId },
      select: notificationSelect,
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  async markWorkspaceInviteNotificationsAsRead(workspaceInviteId: string) {
    return this.prisma.notification.updateMany({
      where: { workspaceInviteId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
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

    return this.prisma.notification.upsert({
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
  }
}
