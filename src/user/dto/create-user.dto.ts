import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ErrorCode } from 'src/common/constants/error-codes';

export class CreateUserDto {
    @ApiProperty({ description: 'The name of the user', example: 'John Doe' })
    @IsNotEmpty({ message: ErrorCode.VAL_NAME_EMPTY })
    @IsString({ message: ErrorCode.VAL_NAME_NOT_STRING })
    name: string;

    @IsNotEmpty({ message: ErrorCode.VAL_EMAIL_EMPTY })
    @IsEmail({}, { message: ErrorCode.VAL_EMAIL_INVALID })
    @ApiProperty({ description: 'The email address of the user', example: 'john.doe@example.com' })
    email: string;

    @ApiPropertyOptional({ description: 'The image URL of the user', example: 'https://example.com/image.jpg' })
    @IsOptional()
    @IsString({ message: ErrorCode.VAL_IMAGE_NOT_STRING })
    image?: string;
}