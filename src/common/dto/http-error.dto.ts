import { ApiProperty } from '@nestjs/swagger';
import { ErrorCode } from '../constants/error-codes';

export class HttpErrorDto {
  @ApiProperty()
  statusCode: number;

  @ApiProperty()
  error: string;

  @ApiProperty()
  message: string;
}

export class BadRequestErrorDto extends HttpErrorDto {
  @ApiProperty({ example: 400 })
  override statusCode = 400;

  @ApiProperty({ example: 'Bad Request' })
  override error = 'Bad Request';
  @ApiProperty({ example: [ErrorCode.VAL_ERROR] })
  declare message: string;
}

export class UnauthorizedErrorDto extends HttpErrorDto {
  @ApiProperty({ example: 401 })
  override statusCode = 401;

  @ApiProperty({ example: 'Unauthorized' })
  override error = 'Unauthorized';

  @ApiProperty({ example: ErrorCode.SESSION_INVALID_OR_EXPIRED })
  declare message: string;
}

export class ForbiddenErrorDto extends HttpErrorDto {
  @ApiProperty({ example: 403 })
  override statusCode = 403;
  @ApiProperty({ example: 'Forbidden' })
  override error = 'Forbidden';
  @ApiProperty({ example: ErrorCode.FORBIDDEN })
  declare message: string;
}

export class InternalServerErrorDto extends HttpErrorDto {
  @ApiProperty({ example: 500 })
  override statusCode = 500;

  @ApiProperty({ example: 'Internal Server Error' })
  override error = 'Internal Server Error';

  @ApiProperty({ example: ErrorCode.INTERNAL_SERVER_ERROR })
  declare message: string;
}