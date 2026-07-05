import { applyDecorators, Type } from "@nestjs/common";
import { ApiProperty } from "@nestjs/swagger";
import {
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiInternalServerErrorResponse,
  ApiExtraModels,
  ApiCreatedResponse,
  getSchemaPath,
  ApiOkResponse,
} from "@nestjs/swagger";

export class HttpOkDto<T> {
  @ApiProperty()
  statusCode: number;

  @ApiProperty()
  message: string;

  data: T;
}

export class OkResponseDto<T> extends HttpOkDto<T> {
  @ApiProperty({ example: 200 })
  override statusCode = 200;

  @ApiProperty({ example: "Something successfully" })
  declare message: string;

  declare data: T;
}

export class CreatedResponseDto<T> extends HttpOkDto<T> {
  @ApiProperty({ example: 201 })
  override statusCode = 201;

  @ApiProperty({ example: "Something created successfully" })
  declare message: string;

  declare data: T;
}

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

  @ApiProperty({ example: "Bad Request" })
  override error = "Bad Request";

  @ApiProperty({ example: "VALIDATION_ERROR" })
  declare message: string;
}

export class UnauthorizedErrorDto extends HttpErrorDto {
  @ApiProperty({ example: 401 })
  override statusCode = 401;

  @ApiProperty({ example: "Unauthorized" })
  override error = "Unauthorized";

  @ApiProperty({ example: "SESSION_INVALID_OR_EXPIRED" })
  declare message: string;
}

export class InternalServerErrorDto extends HttpErrorDto {
  @ApiProperty({ example: 500 })
  override statusCode = 500;

  @ApiProperty({ example: "Internal Server Error" })
  override error = "Internal Server Error";

  @ApiProperty({ example: "INTERNAL_SERVER_ERROR" })
  declare message: string;
}

export function ApiCommonErrors() {
  return applyDecorators(
    ApiBadRequestResponse({
      description: "Validation Error",
      type: BadRequestErrorDto,
    }),
    ApiUnauthorizedResponse({
      description: "Unauthorized",
      type: UnauthorizedErrorDto,
    }),
    ApiInternalServerErrorResponse({
      description: "Server Error",
      type: InternalServerErrorDto,
    }),
  );
}

export const ApiCreatedResponseGeneric = <TModel extends Type<any>>(
  model: TModel,
  isArray: boolean = false,
) => {
  return applyDecorators(
    ApiExtraModels(CreatedResponseDto, model),
    ApiCreatedResponse({
      description: "Created successfully",
      schema: {
        allOf: [
          { $ref: getSchemaPath(CreatedResponseDto) },
          {
            properties: {
              data: isArray
                ? {
                    type: "array",
                    items: { $ref: getSchemaPath(model) },
                  }
                : {
                    $ref: getSchemaPath(model),
                  },
            },
          },
        ],
      },
    }),
  );
};

export const ApiOkResponseGeneric = <TModel extends Type<any>>(
  model: TModel,
  isArray: boolean = false,
) => {
  return applyDecorators(
    ApiExtraModels(OkResponseDto, model),
    ApiOkResponse({
      description: "Request successful",
      schema: {
        allOf: [
          { $ref: getSchemaPath(OkResponseDto) },
          {
            properties: {
              data: isArray
                ? {
                    type: "array",
                    items: { $ref: getSchemaPath(model) },
                  }
                : {
                    $ref: getSchemaPath(model),
                  },
            },
          },
        ],
      },
    }),
  );
};

export const ApiOkResponsePaginated = <TModel extends Type<any>>(
  model: TModel,
) => {
  return applyDecorators(
    ApiExtraModels(OkResponseDto, model),
    ApiOkResponse({
      description: "Request successful with pagination",
      schema: {
        allOf: [
          { $ref: getSchemaPath(OkResponseDto) },
          {
            properties: {
              data: {
                type: "object",
                properties: {
                  items: {
                    type: "array",
                    items: { $ref: getSchemaPath(model) },
                  },
                  total: { type: "number", example: 100 },
                  page: { type: "number", example: 1 },
                  limit: { type: "number", example: 20 },
                },
                required: ["items", "total", "page", "limit"],
              },
            },
          },
        ],
      },
    }),
  );
};

