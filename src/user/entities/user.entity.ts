import { ApiProperty } from "@nestjs/swagger";
import { User } from "generated/prisma/client";

export class UserEntity implements User {
    @ApiProperty({ example : 'Nguyen Van A', description: 'The name of the user' })
    name: string;
    @ApiProperty({ example : '123e4567-e89b-12d3-a456-426614174008', description: 'The unique identifier of the user' })
    id: string;
    @ApiProperty({ example : 'user@example.com', description: 'The email of the user' })
    email: string;
    @ApiProperty({ example : true, description: 'Indicates if the user email is verified' })
    emailVerified: boolean;
    @ApiProperty({ example : 'https://example.com/image.jpg', description: 'The profile image URL of the user', nullable: true })
    image: string | null;
    @ApiProperty()
    createdAt: Date;
    @ApiProperty()
    updatedAt: Date;
}