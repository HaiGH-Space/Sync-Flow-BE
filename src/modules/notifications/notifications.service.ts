import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/database/prisma/prisma.service";
import { NotificationType } from "generated/prisma/client";

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  findAllByUserId(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        workspaceInvite: {
          include: {
            workspace: true,
            inviter: true,
          },
        },
      },
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

    const payload = {
      workspaceInviteId: invite.id,
      workspaceId: invite.workspaceId,
      workspaceName: invite.workspace.name,
      workspaceUrlSlug: invite.workspace.urlSlug,
      inviterId: invite.inviterId,
      inviterName: invite.inviter.name,
      inviterEmail: invite.inviter.email,
      email: invite.email,
      role: invite.role,
      token: invite.token,
      expiresAt: invite.expiresAt,
    };

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
        payload,
      },
      create: {
        userId: recipient.id,
        workspaceInviteId: invite.id,
        type: NotificationType.WORKSPACE_INVITE,
        title: `You were invited to ${invite.workspace.name}`,
        message: `${invite.inviter.name} invited you to join ${invite.workspace.name} as ${invite.role.toLowerCase()}.`,
        payload,
      },
    });
  }
}
