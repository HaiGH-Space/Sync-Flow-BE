import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString, IsOptional, IsStrongPassword } from "class-validator";
import { ErrorCode } from "src/common/constants/error-codes";

export class RegisterDto {
  @ApiProperty({ example: 'Nguyen Van A', description: 'User full name' })
  @IsNotEmpty({ message: ErrorCode.VAL_NAME_EMPTY })
  @IsString({ message: ErrorCode.VAL_NAME_NOT_STRING })
  name: string;

  @ApiProperty({ example: 'user@example.com', description: 'User email address' })
  @IsEmail({}, { message: ErrorCode.VAL_EMAIL_INVALID })
  email: string;
  
  @ApiProperty({ example: "strongPassword123!", description: "User's password" })
  @IsStrongPassword({}, { message: ErrorCode.VAL_PASSWORD_WEAK })
  password: string;

  @ApiProperty({ example: 'https://example.com/image.jpg', description: 'User profile image URL', required: false })
  @IsOptional()
  @IsString({ message: ErrorCode.VAL_NAME_NOT_STRING })
  image?: string;
}