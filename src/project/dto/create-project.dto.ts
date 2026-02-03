import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, Length, Matches } from "class-validator";
import { ErrorCode } from "src/common/constants/error-codes";

export class CreateProjectDto {
    @ApiProperty({ example: 'Backend Development' })
    @IsNotEmpty({ message: ErrorCode.VAL_NAME_EMPTY })
    name: string;
    @ApiProperty({ example: 'BACKEND', description: 'Short key for issues (e.g. SF-1)' })
    @Length(2, 5, { message: ErrorCode.VAL_KEY_LENGTH_INVALID })
    @Matches(/^[A-Z0-9]+$/, { message: ErrorCode.VAL_KEY_PATTERN_INVALID })
    key: string;
    @ApiProperty({ required: false })
    description?: string;
}
