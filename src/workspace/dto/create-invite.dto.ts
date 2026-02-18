import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsEnum, IsNotEmpty } from "class-validator";
import { Role } from "generated/prisma/enums";
import { ErrorCode } from "src/common/constants/error-codes";

export class CreateInviteDto {
    @ApiProperty({ example: 'user@example.com', description: 'The email of the user to invite' })
    @IsNotEmpty({ message: ErrorCode.VAL_EMAIL_EMPTY })
    @IsEmail({}, { message: ErrorCode.VAL_EMAIL_INVALID })
    email: string;
    
    @ApiProperty({ example: Role.MEMBER, description: 'The role of the user to invite' })
    @IsEnum(Role, { message: ErrorCode.VAL_KEY_PATTERN_INVALID })
    role: Role
}