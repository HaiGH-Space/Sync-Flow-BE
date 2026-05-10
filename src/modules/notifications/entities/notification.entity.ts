import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { JsonValue } from "@prisma/client/runtime/client";
import { Notification, NotificationType } from "generated/prisma/client";

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
  payload: JsonValue;
  @ApiProperty({ example: false })
  isRead: boolean;
  @ApiPropertyOptional({ example: "2024-06-01T12:00:00Z" })
  readAt: Date | null;
  @ApiProperty()
  createdAt: Date;
  @ApiProperty()
  updatedAt: Date;
}
