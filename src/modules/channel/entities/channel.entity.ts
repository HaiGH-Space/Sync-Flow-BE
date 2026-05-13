import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Channel, ChannelType } from "generated/prisma/client";
import { ChannelMemberEntity } from "src/modules/channel-members/entities/channel-member.entity";

export class ChannelEntity implements Channel {
  @ApiPropertyOptional({ example: "Backend" })
  name: string | null;
  @ApiProperty({ example: "123e4567-e89b-12d3-a456-4266141740000" })
  id: string;
  @ApiProperty({ enum: ChannelType, example: ChannelType.GROUP })
  type: ChannelType;
  @ApiProperty({ example: "123e4567-e89b-12d3-a456-4266141740001" })
  projectId: string;
  @ApiProperty()
  createdAt: Date;
  @ApiProperty()
  updatedAt: Date;
}

export class ChannelWithMembersEntity extends ChannelEntity {
  @ApiProperty({ type: () => [ChannelMemberEntity] })
  members: ChannelMemberEntity[];
}
