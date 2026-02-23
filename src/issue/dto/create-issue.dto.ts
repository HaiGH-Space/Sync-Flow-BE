import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";
import { Priority } from "generated/prisma/enums";
import { ErrorCode } from "src/common/constants/error-codes";

export class CreateIssueDto {
    @ApiProperty({ example: 'Implement authentication', description: 'The title of the issue' })
    @IsNotEmpty({ message: ErrorCode.VAL_TITLE_EMPTY })
    @IsString({ message: ErrorCode.VAL_TITLE_NOT_STRING })
    title: string;

    @ApiProperty({ example: 'This is a description of the issue', description: 'Detailed information about the issue' })
    @ApiPropertyOptional()
    @IsOptional()
    description: string | null;

    @ApiProperty({ example: 'HIGH', description: 'The priority level of the issue', enum: Priority })
    @IsNotEmpty({ message: ErrorCode.VAL_PRIORITY_EMPTY })
    @IsEnum(Priority, { message: ErrorCode.VAL_PRIORITY_INVALID })
    priority: Priority;

    @ApiProperty({ example: 1, description: 'The order of the issue within its column' })
    @IsNotEmpty({ message: ErrorCode.VAL_ORDER_EMPTY })
    @IsNumber({}, { message: ErrorCode.VAL_ORDER_NOT_NUMBER })
    order: number;

    @ApiProperty({ example: '123e4567-e89b-12d3-a456-4266141740C99', description: 'Identifier of the column the issue belongs to' })
    @IsNotEmpty({ message: ErrorCode.VAL_COLUMN_ID_EMPTY })
    @IsString({ message: ErrorCode.VAL_COLUMN_ID_NOT_STRING })
    columnId: string;

    @ApiPropertyOptional()
    @IsOptional()
    @ApiProperty({ nullable: true, example: '123e4567-e89b-12d3-a456-4266141740C99', description: 'Identifier of the user assigned to the issue' })
    assigneeId: string | null;
}
