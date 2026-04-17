import { ApiProperty } from "@nestjs/swagger";
import { Role, WorkspaceMember } from "generated/prisma/client";
import { UserProfileEntity } from "src/modules/users/entities/user-profile.entity";

export class WorkspaceMemberEntity implements WorkspaceMember {
    @ApiProperty({ example: '123e4567-e89b-12d3-a456-4266141740000' })
    id: string;
    @ApiProperty({ example: '123e4567-e89b-12d3-a456-4266141740001' })
    workspaceId: string;
    @ApiProperty({ example: '123e4567-e89b-12d3-a456-4266141740002' })
    userId: string;
    @ApiProperty({ enum: Role, example: 'ADMIN' })
    role: Role;
    joinedAt: Date;
}

export class WorkspaceMemberWithUserProfileEntity extends WorkspaceMemberEntity {
    user: UserProfileEntity
}
