import { HttpExceptionFilter } from "./http-exception.filter";
import { HttpException, HttpStatus, InternalServerErrorException } from "@nestjs/common";
import { ArgumentsHost } from "@nestjs/common";
import { Response } from "express";
import { ErrorCode } from "../constants/error-codes";

describe("HttpExceptionFilter", () => {
  let filter: HttpExceptionFilter;
  let mockStatus: jest.Mock;
  let mockJson: jest.Mock;
  let mockResponse: Partial<Response>;
  let mockArgumentsHost: Partial<ArgumentsHost>;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    mockStatus = jest.fn().mockReturnThis();
    mockJson = jest.fn().mockReturnThis();
    mockResponse = {
      status: mockStatus,
      json: mockJson,
    } as unknown as Partial<Response>;

    mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => mockResponse,
        getRequest: () => ({}),
      }),
    } as unknown as Partial<ArgumentsHost>;
  });

  it("should format custom HTTP exception (non-500) correctly", () => {
    const exception = new HttpException("CUSTOM_ERROR", HttpStatus.BAD_REQUEST);

    filter.catch(exception, mockArgumentsHost as ArgumentsHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockJson).toHaveBeenCalledWith({
      statusCode: HttpStatus.BAD_REQUEST,
      error: "Bad Request",
      message: "CUSTOM_ERROR",
    });
  });

  it("should replace internal server error message with ErrorCode.INTERNAL_SERVER_ERROR", () => {
    const exception = new InternalServerErrorException("Some internal database message");

    filter.catch(exception, mockArgumentsHost as ArgumentsHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(mockJson).toHaveBeenCalledWith({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: "Internal Server Error",
      message: ErrorCode.INTERNAL_SERVER_ERROR,
    });
  });

  it("should handle non-HttpException errors and return 500 status with ErrorCode.INTERNAL_SERVER_ERROR", () => {
    const exception = new Error("Severe Database Crash Connection Pool Exhausted");

    filter.catch(exception, mockArgumentsHost as ArgumentsHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(mockJson).toHaveBeenCalledWith({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: "Internal Server Error",
      message: ErrorCode.INTERNAL_SERVER_ERROR,
    });
  });
});
