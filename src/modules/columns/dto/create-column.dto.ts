import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";
import { ErrorCode } from "src/common/constants/error-codes";

export class CreateColumnDto {
    @ApiProperty({ example: 'To Do' })
    @IsNotEmpty({ message: ErrorCode.VAL_NAME_EMPTY })
    @IsString({ message: ErrorCode.VAL_NAME_NOT_STRING })
    name: string;

    @ApiProperty({ example: 1, description: 'Order of the column' })
    @IsNotEmpty({ message: ErrorCode.VAL_ORDER_EMPTY })
    order: number;
}