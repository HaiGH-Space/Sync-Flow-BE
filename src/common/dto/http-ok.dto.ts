import { ApiProperty } from "@nestjs/swagger";

export class HttpOkDto<T> {
    @ApiProperty()
    statusCode: number;
    @ApiProperty()
    message: string;
    @ApiProperty()
    data: T;
}

export class OkResponseDto<T> extends HttpOkDto<T> {
    @ApiProperty({ example: 200 })
    override statusCode = 200;
    @ApiProperty({ example: 'Something successfully' })
    declare message: string;
    @ApiProperty()
    declare data: T;
}

export class CreatedResponseDto<T> extends HttpOkDto<T> {
    @ApiProperty({ example: 201 })
    override statusCode = 201;
    @ApiProperty({ example: 'Something created successfully' })
    declare message: string;
    @ApiProperty()
    declare data: T;
}
