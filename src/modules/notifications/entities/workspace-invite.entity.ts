import { ApiProperty } from "@nestjs/swagger";
import { Role } from "generated/prisma/enums";
import { UserEntity } from "src/modules/users/entities/user.entity";
import { WorkspaceEntity } from "src/modules/workspaces/entities/workspace.entity";

export class WorkspaceInviteEntity {
  @ApiProperty({ example: "123e4567-e89b-12d3-a456-426614174002" })
  id: string;

  @ApiProperty({ example: "123e4567-e89b-12d3-a456-426614174000" })
  workspaceId: string;

  @ApiProperty({ example: "123e4567-e89b-12d3-a456-426614174001" })
  inviterId: string;

  @ApiProperty({ example: "user@example.com" })
  email: string;

  @ApiProperty({ enum: Role, example: Role.MEMBER })
  role: Role;

  @ApiProperty({ example: "d9f8f7f5f1b84c6e9e6f2f3b1c2d3e4f" })
  token: string;

  @ApiProperty({ example: "2026-05-17T12:00:00.000Z" })
  expiresAt: Date;

  @ApiProperty({ example: "2026-05-10T12:00:00.000Z" })
  createdAt: Date;

  @ApiProperty({ type: () => WorkspaceEntity })
  workspace: WorkspaceEntity;

  @ApiProperty({ type: () => UserEntity })
  inviter: UserEntity;
}
