import { ApiProperty } from "@nestjs/swagger";

export class BooleanEntity {
    @ApiProperty({ example: true })
    status: boolean;
}