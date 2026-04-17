import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Sprint, SprintStatus } from "generated/prisma/client";

export class SprintEntity implements Sprint {
    @ApiProperty({example: "123e4567-e89b-12d3-a456-426614174000", description: "Unique identifier for the sprint" })
    id: string;
    @ApiProperty({example: "Sprint 1", description: "Name of the sprint" })
    name: string;
    @ApiProperty({ nullable: true, example: "This sprint focuses on implementing the user authentication module.", description: "Goal or objective of the sprint" })
    goal: string | null;
    @ApiPropertyOptional()
    startDate: Date | null;
    @ApiPropertyOptional()
    endDate: Date | null;
    @ApiProperty({example: SprintStatus.ACTIVE, description: "Current status of the sprint", enum: SprintStatus })
    status: SprintStatus;
    @ApiProperty({example: "123e4567-e89b-12d3-a456-426614174000", description: "Identifier of the project this sprint belongs to" })
    projectId: string;
    @ApiProperty()
    createdAt: Date;
    @ApiProperty()
    updatedAt: Date;
}
