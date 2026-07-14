import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  private formatSize(bytes: number): string {
    if (bytes === undefined || bytes === null || isNaN(bytes)) return '';
    if (bytes < 1024) return `${bytes}b`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}kb`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}mb`;
  }

  private formatParams(params: Record<string, string>): string {
    const entries = Object.entries(params);
    if (entries.length === 0) return '';
    return ` [${entries.map(([k, v]) => `${k}=${v}`).join(', ')}]`;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();

    const { method, originalUrl, params = {} } = request;
    const requestId = request['requestId'];
    const startTime = Date.now();

    return next.handle().pipe(
      // 1. Handles Success Responses (2xx, 3xx)
      tap(() => {
        const { statusCode } = response;
        const duration = Date.now() - startTime;
        const size = this.formatSize(
          Number(response.getHeader('content-length')),
        );
        const reqId = requestId ? ` [reqId: ${requestId}]` : '';
        const sizeStr = size ? ` [size: ${size}]` : '';
        const paramsStr = this.formatParams(params);
        this.logger.log(
          `${method} ${originalUrl} ${statusCode} - ${duration}ms${reqId}${paramsStr}${sizeStr}`,
        );
      }),
      // 2. Handles Error Responses (4xx, 5xx)
      catchError((error) => {
        const duration = Date.now() - startTime;

        // Extract status code from NestJS exceptions or default to 500
        const statusCode =
          error instanceof HttpException ? error.getStatus() : 500;

        // Log as a warning or error based on the level
        const paramsStr = this.formatParams(params);
        const logMsg = `${method} ${originalUrl} ${statusCode} - ${duration}ms${paramsStr} - Error: ${error.message}`;
        if (statusCode >= 500) {
          this.logger.error(logMsg);
        } else {
          this.logger.warn(logMsg);
        }

        // Re-throw the error so your HttpExceptionFilter can still format the user response
        return throwError(() => error);
      }),
    );
  }
}
