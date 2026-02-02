import { applyDecorators } from '@nestjs/common';
import { 
  ApiBadRequestResponse, 
  ApiUnauthorizedResponse, 
  ApiInternalServerErrorResponse 
} from '@nestjs/swagger';
import { BadRequestErrorDto, UnauthorizedErrorDto, InternalServerErrorDto } from '../dto/http-error.dto';

export function ApiCommonErrors() {
  return applyDecorators(
    ApiBadRequestResponse({ description: 'Validation Error', type: BadRequestErrorDto }),
    ApiUnauthorizedResponse({ description: 'Unauthorized', type: UnauthorizedErrorDto }),
    ApiInternalServerErrorResponse({ description: 'Server Error', type: InternalServerErrorDto }),
  );
}