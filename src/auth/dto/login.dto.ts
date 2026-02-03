import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsStrongPassword } from "class-validator";
import { ErrorCode } from "src/common/constants/error-codes";

export class LoginDto {
  @ApiProperty({ example: "user@example.com", description: "User's email address" })
  @IsEmail({}, { message: ErrorCode.VAL_EMAIL_INVALID })
  email: string;

  @IsNotEmpty({ message: ErrorCode.VAL_PASSWORD_EMPTY })
  @IsStrongPassword({}, { message: ErrorCode.VAL_PASSWORD_WEAK })
  password: string;
}