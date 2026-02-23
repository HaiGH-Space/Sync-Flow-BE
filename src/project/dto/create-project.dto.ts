import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, Length, Matches } from "class-validator";
import { ErrorCode } from "src/common/constants/error-codes";

export class CreateProjectDto {
    @IsNotEmpty({ message: ErrorCode.VAL_NAME_EMPTY })
    @ApiProperty({ example: 'Backend Development', description: 'Name of the project' })
    name: string;
    @ApiProperty({ example: 'BACKEND', description: 'Unique key for the project (2-5 chars, A-Z/0-9)' })
    @Length(2, 5, { message: ErrorCode.VAL_KEY_LENGTH_INVALID })
    @Matches(/^[A-Z0-9]+$/, { message: ErrorCode.VAL_KEY_PATTERN_INVALID })
    key: string;

    @ApiPropertyOptional({ example: 'This is a sample project description', description: 'Description of the project' })
    @IsOptional()
    description?: string;
}
