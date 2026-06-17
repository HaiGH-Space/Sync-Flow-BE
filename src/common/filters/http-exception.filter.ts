import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Response } from "express";
import { ErrorCode } from "../constants/error-codes";

const HTTP_STATUS_ERRORS: Record<number, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  402: "Payment Required",
  403: "Forbidden",
  404: "Not Found",
  405: "Method Not Allowed",
  406: "Not Acceptable",
  407: "Proxy Authentication Required",
  408: "Request Timeout",
  409: "Conflict",
  410: "Gone",
  411: "Length Required",
  412: "Precondition Failed",
  413: "Payload Too Large",
  414: "URI Too Long",
  415: "Unsupported Media Type",
  416: "Range Not Satisfiable",
  417: "Expectation Failed",
  418: "I'm a teapot",
  421: "Misdirected Request",
  422: "Unprocessable Entity",
  424: "Failed Dependency",
  429: "Too Many Requests",
  500: "Internal Server Error",
  501: "Not Implemented",
  502: "Bad Gateway",
  503: "Service Unavailable",
  504: "Gateway Timeout",
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const errorResponse: string | object =
      exception instanceof HttpException
        ? exception.getResponse()
        : "Internal Server Error";

    let message: unknown = ErrorCode.INTERNAL_SERVER_ERROR;
    let error = HTTP_STATUS_ERRORS[status] || "Internal Server Error";

    if (exception instanceof HttpException) {
      if (typeof errorResponse === "string") {
        message = errorResponse;
      } else if (typeof errorResponse === "object" && errorResponse !== null) {
        const responseObj = errorResponse as Record<string, unknown>;
        if (typeof responseObj.error === "string") {
          error = responseObj.error;
        }
        if (responseObj.message !== undefined) {
          message = responseObj.message;
        }
      }
    }

    // Crucial security control: for 500 and above, override message to NOT leak internal error details
    if (status >= 500) {
      // Log the original exception stack/details
      if (exception instanceof Error) {
        this.logger.error(`Internal server error: ${exception.message}`, exception.stack);
      } else {
        this.logger.error(`Unknown internal error: ${String(exception)}`);
      }
      message = ErrorCode.INTERNAL_SERVER_ERROR;
      error = "Internal Server Error";
    }

    response.status(status).json({
      statusCode: status,
      error,
      message,
    });
  }
}
