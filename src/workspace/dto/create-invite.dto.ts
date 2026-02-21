import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsEnum, IsNotEmpty, IsOptional } from "class-validator";
import { Role } from "generated/prisma/enums";
import { ErrorCode } from "src/common/constants/error-codes";

export class CreateInviteDto {
    @IsNotEmpty({ message: ErrorCode.VAL_EMAIL_EMPTY })
    @IsEmail({}, { message: ErrorCode.VAL_EMAIL_INVALID })
    email: string;
    
    @ApiPropertyOptional({ example: Role.MEMBER, description: 'Optional role (defaults to MEMBER)' })
    @IsOptional()
    @IsEnum(Role, { message: ErrorCode.VAL_ROLE_INVALID })
    role?: Role
}