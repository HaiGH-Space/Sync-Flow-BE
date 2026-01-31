import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty } from "class-validator";

export class LoginDto {
  @ApiProperty({ example: "user@example.com", description: "User's email address" })
  @IsEmail()
  email: string;

  @ApiProperty({ example: "strongPassword123", description: "User's password" })
  @IsNotEmpty()
  password: string;
}