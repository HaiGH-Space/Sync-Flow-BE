import { ApiPropertyOptional, PickType } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";
import { Priority } from "generated/prisma/enums";
import { ErrorCode } from "src/common/constants/error-codes";
import { IssueEntity } from "../entities/issue.entity";

export class CreateIssueDto extends PickType(IssueEntity, [
    'title',
    'priority',
    'order',
    'columnId',
    'assigneeId',
    'description'
] as const) {
    @IsNotEmpty({ message: ErrorCode.VAL_TITLE_EMPTY })
    @IsString({ message: ErrorCode.VAL_TITLE_NOT_STRING })
    declare title: string;

    @ApiPropertyOptional()
    @IsOptional()
    declare description: string| null;

    @IsNotEmpty({ message: ErrorCode.VAL_PRIORITY_EMPTY })
    @IsEnum(Priority, { message: ErrorCode.VAL_PRIORITY_INVALID })
    declare priority: Priority;

    @IsNotEmpty({ message: ErrorCode.VAL_ORDER_EMPTY })
    @IsNumber({}, { message: ErrorCode.VAL_ORDER_NOT_NUMBER })
    declare order: number;

    @IsNotEmpty({ message: ErrorCode.VAL_COLUMN_ID_EMPTY })
    @IsString({ message: ErrorCode.VAL_COLUMN_ID_NOT_STRING })
    declare columnId: string;

    @ApiPropertyOptional()
    @IsOptional()
    declare assigneeId: string | null;
}
