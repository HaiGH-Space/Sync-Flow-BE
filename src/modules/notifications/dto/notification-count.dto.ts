import { ApiProperty } from "@nestjs/swagger";

export class NotificationCountDto {
  @ApiProperty({ example: 3 })
  count: number;
}
