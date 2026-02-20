import { PickType } from "@nestjs/swagger";
import { IsNotEmpty, IsString, Matches, MinLength } from "class-validator";
import { ErrorCode } from "src/common/constants/error-codes";
import { WorkspaceEntity } from "../entities/workspace.entity";

export class CreateWorkspaceDto extends PickType(WorkspaceEntity, ['name', 'urlSlug'] as const) {
    @IsNotEmpty({ message: ErrorCode.VAL_NAME_EMPTY })
    @IsString({ message: ErrorCode.VAL_NAME_NOT_STRING })
    @MinLength(3, { message: ErrorCode.VAL_NAME_TOO_SHORT })
    declare name: string;

    @IsString({ message: ErrorCode.VAL_SLUG_NOT_STRING })
    @IsNotEmpty({ message: ErrorCode.VAL_SLUG_EMPTY })
    @Matches(/^[a-z0-9-]+$/, { message: ErrorCode.VAL_SLUG_PATTERN_INVALID })
    declare urlSlug: string;
}
