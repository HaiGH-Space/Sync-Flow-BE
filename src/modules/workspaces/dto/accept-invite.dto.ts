import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty } from "class-validator";
import { ErrorCode } from "src/common/constants/error-codes";

export class AcceptInviteDto {
  @ApiProperty({
    description: "The token of the invitation to accept",
    example: "abc123def456",
  })
  @IsNotEmpty({ message: ErrorCode.VAL_TOKEN_EMPTY })
  token: string;
}
