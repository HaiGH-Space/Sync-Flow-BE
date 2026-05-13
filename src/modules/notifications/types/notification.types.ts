import { Prisma } from "generated/prisma/client";

export const notificationSelect = {
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

export type NotificationPayload = Prisma.NotificationGetPayload<{
  select: typeof notificationSelect;
}>;
