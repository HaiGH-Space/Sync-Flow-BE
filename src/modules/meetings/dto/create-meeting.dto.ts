import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsUUID } from "class-validator";

export class CreateMeetingDto {
  @ApiPropertyOptional({ example: 'Meeting for discussion', description: 'Meeting title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-789012345678', description: 'Issue ID' })
  @IsOptional()
  @IsUUID()
  issueId?: string;
}
