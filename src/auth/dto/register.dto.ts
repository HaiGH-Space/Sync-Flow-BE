import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional } from "class-validator";

export class RegisterDto {
  @ApiProperty({ example: 'Nguyen Van A', description: 'User full name' })
  @IsNotEmpty({ message: 'Name must not be empty' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'user@example.com', description: 'User email address' })
  @IsEmail({}, { message: 'Invalid email address' })
  email: string;
  
  @ApiProperty({ example: 'strongpassword', description: 'User password' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

  @ApiProperty({ example: 'https://example.com/image.jpg', description: 'User profile image URL', required: false })
  @IsOptional()
  @IsString()
  image?: string;
}