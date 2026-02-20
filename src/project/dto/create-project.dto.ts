import { ApiPropertyOptional, PickType } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, Length, Matches } from "class-validator";
import { ErrorCode } from "src/common/constants/error-codes";
import { ProjectEntity } from "../entities/project.entity";

export class CreateProjectDto extends PickType(ProjectEntity, ['name', 'key'] as const) {
    @IsNotEmpty({ message: ErrorCode.VAL_NAME_EMPTY })
    declare name: string;

    @Length(2, 5, { message: ErrorCode.VAL_KEY_LENGTH_INVALID })
    @Matches(/^[A-Z0-9]+$/, { message: ErrorCode.VAL_KEY_PATTERN_INVALID })
    declare key: string;

    @ApiPropertyOptional()
    @IsOptional()
    description?: string;
}
