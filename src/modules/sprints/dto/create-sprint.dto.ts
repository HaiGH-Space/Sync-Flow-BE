import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsNotEmpty, IsOptional } from "class-validator";

export class CreateSprintDto {
    @IsNotEmpty({ message: "Sprint name is required" })
    @ApiProperty({example: "Sprint 1", description: "Name of the sprint" })
    name: string
    @IsOptional()
    @ApiPropertyOptional({ example: "This sprint focuses on...", description: "Goal of the sprint" })
    goal?: string
    @IsOptional()
    @IsDateString()
    @ApiPropertyOptional({ example: "2024-01-01T00:00:00Z", description: "Start date of the sprint" })
    startDate?: Date
    @IsOptional()
    @IsDateString()
    @ApiPropertyOptional({ example: "2024-01-15T00:00:00Z", description: "End date of the sprint" })
    endDate?: Date
}
