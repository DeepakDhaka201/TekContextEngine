import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Inject,
  LoggerService,
} from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    
    const requestId = Math.random().toString(36).substring(2, 8);
    
    // Determine HTTP status code
    const httpStatus = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    // Extract error information
    const errorMessage = exception instanceof Error ? exception.message : String(exception);
    const errorStack = exception instanceof Error ? exception.stack : undefined;
    
    // Get additional error details for HTTP exceptions
    let errorResponse: any = errorMessage;
    if (exception instanceof HttpException) {
      errorResponse = exception.getResponse();
    }

    // Log the exception with comprehensive details
    this.logger.error(`[${requestId}] [EXCEPTION-FILTER] Unhandled exception caught`, {
      requestId,
      method: request.method,
      url: request.url,
      statusCode: httpStatus,
      error: errorMessage,
      stack: errorStack,
      userAgent: request.headers['user-agent'],
      clientIp: request.ip || request.connection.remoteAddress,
      timestamp: new Date().toISOString(),
      requestHeaders: this.sanitizeHeaders(request.headers),
      requestBody: this.sanitizeBody(request.body),
      query: request.query,
      params: request.params,
      exceptionType: exception?.constructor?.name || 'Unknown',
      isHttpException: exception instanceof HttpException
    });

    // Create error response
    const errorResponseBody = {
      success: false,
      statusCode: httpStatus,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: this.getErrorMessage(errorResponse),
      error: httpStatus >= 500 ? 'Internal Server Error' : this.getErrorType(errorResponse),
      requestId,
    };

    // Add detailed error information in development
    if (process.env.NODE_ENV === 'development') {
      errorResponseBody['details'] = errorResponse;
      if (errorStack) {
        errorResponseBody['stack'] = errorStack;
      }
    }

    // Log the response being sent
    this.logger.debug(`[${requestId}] [EXCEPTION-FILTER] Sending error response`, {
      requestId,
      statusCode: httpStatus,
      responseBody: errorResponseBody,
      isDevelopment: process.env.NODE_ENV === 'development'
    });

    response.status(httpStatus).json(errorResponseBody);
  }

  /**
   * Extract error message from various error response formats
   */
  private getErrorMessage(errorResponse: any): string {
    if (typeof errorResponse === 'string') {
      return errorResponse;
    }
    
    if (typeof errorResponse === 'object') {
      if (errorResponse.message) {
        return Array.isArray(errorResponse.message) 
          ? errorResponse.message.join(', ')
          : errorResponse.message;
      }
      
      if (errorResponse.error) {
        return errorResponse.error;
      }
    }
    
    return 'An error occurred';
  }

  /**
   * Extract error type from error response
   */
  private getErrorType(errorResponse: any): string {
    if (typeof errorResponse === 'object' && errorResponse.error) {
      return errorResponse.error;
    }
    
    return 'Bad Request';
  }

  /**
   * Sanitize headers to remove sensitive information
   */
  private sanitizeHeaders(headers: any): any {
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
    const sanitized = { ...headers };
    
    for (const header of sensitiveHeaders) {
      if (sanitized[header]) {
        sanitized[header] = '***REDACTED***';
      }
    }
    
    return sanitized;
  }

  /**
   * Sanitize request body to remove sensitive information
   */
  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
    const sanitized = { ...body };
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    }
    
    return sanitized;
  }
}
