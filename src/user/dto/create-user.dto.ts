import { ApiPropertyOptional, PickType } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ErrorCode } from 'src/common/constants/error-codes';
import { UserEntity } from '../entities/user.entity';

export class CreateUserDto extends PickType(UserEntity, ['name', 'email'] as const) {
    @IsNotEmpty({ message: ErrorCode.VAL_NAME_EMPTY })
    @IsString({ message: ErrorCode.VAL_NAME_NOT_STRING })
    declare name: string;

    @IsNotEmpty({ message: ErrorCode.VAL_EMAIL_EMPTY })
    @IsEmail({}, { message: ErrorCode.VAL_EMAIL_INVALID })
    declare email: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString({ message: ErrorCode.VAL_IMAGE_NOT_STRING })
    image?: string;
}