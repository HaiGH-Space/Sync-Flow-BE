import { ApiProperty } from "@nestjs/swagger";

export class BooleanResponseDto {
  @ApiProperty({ example: true })
  status: boolean;
}
