import { ApiProperty } from "@nestjs/swagger";
import { Meeting } from "generated/prisma/client";

export class MeetingEntity implements Meeting {
    @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174002' })
    id: string;
    @ApiProperty({ example: 'Team Meeting' ,nullable: true })
    title: string | null;
    @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174002' ,nullable: true })
    issueId: string | null;
    @ApiProperty({ example: '2023-10-10T10:00:00.000Z' })
    startedAt: Date;
    @ApiProperty({ example: '2023-10-10T10:00:00.000Z' ,nullable: true })
    endedAt: Date | null;
}
