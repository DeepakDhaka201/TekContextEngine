import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
  LoggerService,
} from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    
    const requestId = Math.random().toString(36).substring(2, 8);
    const startTime = Date.now();
    
    // Extract request information
    const { method, url, headers, body, query, params } = request;
    const userAgent = headers['user-agent'] || 'unknown';
    const clientIp = request.ip || request.connection.remoteAddress || 'unknown';
    
    // Log incoming request
    this.logger.log(`[${requestId}] [REQUEST] Incoming ${method} ${url}`, {
      requestId,
      method,
      url,
      userAgent,
      clientIp,
      contentType: headers['content-type'],
      contentLength: headers['content-length'],
      hasBody: !!body && Object.keys(body).length > 0,
      queryParams: Object.keys(query || {}).length,
      pathParams: Object.keys(params || {}).length,
      timestamp: new Date().toISOString()
    });

    // Log request details in debug mode
    this.logger.debug(`[${requestId}] [REQUEST-DETAILS] Request details`, {
      requestId,
      headers: this.sanitizeHeaders(headers),
      query,
      params,
      bodyKeys: body ? Object.keys(body) : [],
      bodySize: body ? JSON.stringify(body).length : 0
    });

    return next.handle().pipe(
      tap((data) => {
        const duration = Date.now() - startTime;
        const statusCode = response.statusCode;
        
        // Log successful response
        this.logger.log(`[${requestId}] [RESPONSE] ${method} ${url} - ${statusCode}`, {
          requestId,
          method,
          url,
          statusCode,
          duration,
          responseSize: data ? JSON.stringify(data).length : 0,
          success: statusCode >= 200 && statusCode < 300,
          timestamp: new Date().toISOString()
        });

        // Log response details in debug mode
        this.logger.debug(`[${requestId}] [RESPONSE-DETAILS] Response details`, {
          requestId,
          statusCode,
          duration,
          responseHeaders: this.sanitizeHeaders(response.getHeaders()),
          responseDataKeys: data && typeof data === 'object' ? Object.keys(data) : [],
          responseType: typeof data
        });
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        const statusCode = response.statusCode || 500;
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        // Log error response
        this.logger.error(`[${requestId}] [ERROR] ${method} ${url} - ${statusCode}`, {
          requestId,
          method,
          url,
          statusCode,
          duration,
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString()
        });

        // Re-throw the error
        throw error;
      })
    );
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
}
