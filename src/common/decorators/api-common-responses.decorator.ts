import { applyDecorators, Type } from '@nestjs/common';
import { 
  ApiBadRequestResponse, 
  ApiUnauthorizedResponse, 
  ApiInternalServerErrorResponse, 
  ApiExtraModels,
  ApiCreatedResponse,
  getSchemaPath,
  ApiOkResponse
} from '@nestjs/swagger';
import { BadRequestErrorDto, UnauthorizedErrorDto, InternalServerErrorDto } from '../dto/http-error.dto';
import { CreatedResponseDto, OkResponseDto } from '../dto/http-ok.dto';

export function ApiCommonErrors() {
  return applyDecorators(
    ApiBadRequestResponse({ description: 'Validation Error', type: BadRequestErrorDto }),
    ApiUnauthorizedResponse({ description: 'Unauthorized', type: UnauthorizedErrorDto }),
    ApiInternalServerErrorResponse({ description: 'Server Error', type: InternalServerErrorDto }),
  );
}

export const ApiCreatedResponseGeneric = <TModel extends Type<any>>(model: TModel) => {
  return applyDecorators(
    ApiExtraModels(CreatedResponseDto, model),
    ApiCreatedResponse({
      schema: {
        allOf: [
          { $ref: getSchemaPath(CreatedResponseDto) },
          {
            properties: {
              data: { $ref: getSchemaPath(model) },
            },
          },
        ],
      },
    }),
  );
};

export const ApiOkResponseGeneric = <TModel extends Type<any>>(model: TModel) => {
  return applyDecorators(
    ApiExtraModels(OkResponseDto, model),
    ApiOkResponse({
      schema: {
        allOf: [
          { $ref: getSchemaPath(OkResponseDto) },
          {
            properties: {
              data: { $ref: getSchemaPath(model) },
            },
          },
        ],
      },
    }),
  );
}