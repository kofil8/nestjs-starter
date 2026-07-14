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

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();

    const { method, originalUrl } = request;
    const startTime = Date.now();

    return next.handle().pipe(
      // 1. Handles Success Responses (2xx, 3xx)
      tap(() => {
        const { statusCode } = response;
        const duration = Date.now() - startTime;
        this.logger.log(
          `${method} ${originalUrl} ${statusCode} - ${duration}ms`,
        );
      }),
      // 2. Handles Error Responses (4xx, 5xx)
      catchError((error) => {
        const duration = Date.now() - startTime;

        // Extract status code from NestJS exceptions or default to 500
        const statusCode =
          error instanceof HttpException ? error.getStatus() : 500;

        // Log as a warning or error based on the level
        const logMsg = `${method} ${originalUrl} ${statusCode} - ${duration}ms - Error: ${error.message}`;
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
