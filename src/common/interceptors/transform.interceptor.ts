import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response } from 'express';

export interface ResponseFormat<T> {
    statusCode: number;
    message: string;
    data: T;
}

interface ControllerResponse {
    message?: string;
    data?: unknown;
}

@Injectable()
export class TransformInterceptor<T>
    implements NestInterceptor<T, ResponseFormat<T>> {
    intercept(
        context: ExecutionContext,
        next: CallHandler,
    ): Observable<ResponseFormat<T>> {
        return next.handle().pipe(
            map((data) => {
                const response = context.switchToHttp().getResponse<Response>();
                const ctx = data as ControllerResponse;
                return {
                    statusCode: response.statusCode,
                    message: ctx?.message || 'Success',
                    data: (ctx?.data || data) as T,
                };
            }),
        );
    }
}