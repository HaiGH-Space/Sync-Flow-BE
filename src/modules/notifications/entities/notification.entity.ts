import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Notification, NotificationType } from "generated/prisma/client";
import { WorkspaceInviteEntity } from "./workspace-invite.entity";

export class NotificationEntity implements Notification {
  @ApiProperty({ example: "123e4567-e89b-12d3-a456-426614174002" })
  id: string;
  @ApiProperty({ example: "123e4567-e89b-12d3-a456-426614174001" })
  userId: string;
  @ApiPropertyOptional({ example: "123e4567-e89b-12d3-a456-426614174002" })
  workspaceInviteId: string | null;
  @ApiProperty({
    enum: NotificationType,
    example: NotificationType.WORKSPACE_INVITE,
  })
  type: NotificationType;
  @ApiProperty({ example: "You have a new workspace invite!" })
  title: string;
  @ApiPropertyOptional({ example: "Click here to view the invite." })
  message: string | null;
  @ApiPropertyOptional({
    type: "object",
    additionalProperties: true,
    nullable: true,
    example: {
      workspaceInviteId: "123e4567-e89b-12d3-a456-426614174002",
      workspaceId: "123e4567-e89b-12d3-a456-426614174000",
      workspaceName: "Team Dev SyncFlow",
      workspaceUrlSlug: "team-dev-sf",
      inviterId: "123e4567-e89b-12d3-a456-426614174001",
      inviterName: "Nguyen Van A",
      inviterEmail: "user@example.com",
      email: "user@example.com",
      role: "MEMBER",
      token: "d9f8f7f5f1b84c6e9e6f2f3b1c2d3e4f",
      expiresAt: "2026-05-17T12:00:00.000Z",
    },
  })
  payload: any;
  @ApiPropertyOptional({ type: () => WorkspaceInviteEntity, nullable: true })
  workspaceInvite?: Record<string, unknown> | null;
  @ApiProperty({ example: false })
  isRead: boolean;
  @ApiPropertyOptional({ example: "2024-06-01T12:00:00Z" })
  readAt: Date | null;
  @ApiProperty()
  createdAt: Date;
  @ApiProperty()
  updatedAt: Date;
}
