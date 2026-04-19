import { IsString, IsOptional, IsEnum, IsArray } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { ChannelType } from "generated/prisma/enums";

export class CreateChannelDto {
  @ApiProperty({ example: "Team Backend", required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ enum: ChannelType, default: ChannelType.GROUP })
  @IsEnum(ChannelType)
  type: ChannelType;

  @ApiProperty({
    example: ["user-uuid-1", "user-uuid-2"],
    description: "Danh sách ID thành viên mời vào nhóm",
  })
  @IsArray()
  @IsOptional()
  memberIds?: string[];
}
