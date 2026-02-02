import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, Matches, MinLength } from "class-validator";
import { ErrorCode } from "src/common/constants/error-codes";

export class CreateWorkspaceDto {
    @ApiProperty({ example: 'My Workspace', description: 'The name of the workspace' })
    @IsNotEmpty({ message: ErrorCode.VAL_NAME_EMPTY })
    @IsString({ message: ErrorCode.VAL_NAME_NOT_STRING })
    @MinLength(3, { message: ErrorCode.VAL_NAME_TOO_SHORT })
    name: string;

    @ApiProperty({ example: 'my-workspace-01', description: 'The URL slug for the workspace' })
    @IsString({ message: ErrorCode.VAL_SLUG_NOT_STRING })
    @IsNotEmpty({ message: ErrorCode.VAL_SLUG_EMPTY })
    @Matches(/^[a-z0-9-]+$/, {
        message: ErrorCode.VAL_SLUG_PATTERN_INVALID,
    })
    urlSlug: string;
}
