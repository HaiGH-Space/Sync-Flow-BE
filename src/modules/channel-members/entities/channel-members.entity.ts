import { ApiProperty } from "@nestjs/swagger";
import { ChannelMember } from "generated/prisma/client";

export class ChannelMemberEntity implements ChannelMember {
  @ApiProperty({ example: "123e4567-e89b-12d3-a456-426614174000" })
  id: string;
  @ApiProperty({ example: "123e4567-e89b-12d3-a456-426614174000" })
  channelId: string;
  @ApiProperty({ example: "123e4567-e89b-12d3-a456-426614174000" })
  userId: string;
  @ApiProperty()
  joinedAt: Date;
}
