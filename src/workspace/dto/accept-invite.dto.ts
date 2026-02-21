import { IsNotEmpty } from "class-validator";
import { ErrorCode } from "src/common/constants/error-codes";

export class AcceptInviteDto {
    @IsNotEmpty({ message: ErrorCode.VAL_TOKEN_EMPTY })
    token: string;
}