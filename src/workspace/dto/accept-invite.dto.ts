import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty } from "class-validator";
import { ErrorCode } from "src/common/constants/error-codes";

export class AcceptInviteDto {
    @ApiProperty({ description: 'The invite token' })
    @IsNotEmpty({ message: ErrorCode.VAL_ERROR })
    token: string;
}