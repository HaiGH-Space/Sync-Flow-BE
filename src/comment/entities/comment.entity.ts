import { ApiProperty } from "@nestjs/swagger";
import { Comment } from "generated/prisma/client";

export class CommentEntity implements Comment {
    @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174002' })
    id: string;
    @ApiProperty({ example: 'This is a comment' })
    content: string;
    @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174002' })
    issueId: string;
    @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174002' })
    userId: string;
    @ApiProperty({ example: '2023-01-01T00:00:00.000Z' })
    createdAt: Date;
    @ApiProperty({ example: '2023-01-01T00:00:00.000Z' })
    updatedAt: Date;
}
