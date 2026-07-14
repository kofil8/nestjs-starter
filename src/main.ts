import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { randomUUID } from 'crypto';
import compression from 'compression';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { Logger, LoggerErrorInterceptor } from 'nestjs-pino';
import expressBasicAuth from 'express-basic-auth';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  const configService = app.get(ConfigService);
  const logger = app.get(Logger);
  app.useLogger(logger);

  // ─── Security Middleware ───────────────────────────
  app.use(helmet());

  // ─── CORS Configuration ────────────────────────────
  // Use the parsed, trimmed array from config so multiple comma-separated
  // origins match correctly. Never fall back to reflect-all with credentials.
  const corsOrigins = configService.get<string[]>('cors.origins') ?? [
    'http://localhost:3000',
  ];
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  // ─── Compression ───────────────────────────────────
  app.use(compression());

  // ─── Cookie Parser ─────────────────────────────────
  app.use(cookieParser());

  // ─── Request ID Middleware ─────────────────────────
  app.use((req, _res, next) => {
    const requestId = req.headers['x-request-id'] || randomUUID();
    req['requestId'] = requestId;
    _res.setHeader('x-request-id', requestId);
    next();
  });

  // ─── Global Routing Prefix & Versioning ────────────
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'v',
  });

  // ─── Global Pipes ──────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ─── Global Interceptors & Filters ─────────────────
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
    new LoggerErrorInterceptor(),
  );
  // AllExceptionsFilter handles ALL exceptions including HttpException
  app.useGlobalFilters(new AllExceptionsFilter());

  // ─── Static Assets (local uploads) ─────────────────
  const uploadDir = configService.get<string>('upload.dir', './uploads');
  app.useStaticAssets(join(process.cwd(), uploadDir), {
    prefix: '/uploads/',
  });

  // ─── Swagger / OpenAPI (non-production only) ──────
  const nodeEnv = configService.get<string>('app.nodeEnv', 'development');
  if (nodeEnv !== 'production' && nodeEnv !== 'test') {
    // Protect both the UI page and the JSON spec endpoint
    app.use(
      ['/api/v1/docs', '/api/v1/docs-json'],
      expressBasicAuth({
        challenge: true,
        users: { admin: 'kofil' },
      }),
    );

    const { swaggerConfig } = await import('./common/swagger.config');
    swaggerConfig(app, configService);
  }

  // ─── Server Initialization ─────────────────────────
  const port = configService.get<number>('app.port', 9001);
  await app.listen(port);

  // ─── Graceful Shutdown ─────────────────────────────
  const signals = ['SIGTERM', 'SIGINT'];
  for (const signal of signals) {
    process.on(signal, async () => {
      logger.log(`Received ${signal}. Shutting down gracefully...`);
      await app.close();
      process.exit(0);
    });
  }

  logger.log(`Server running on http://localhost:${port}/api/v1`);
  if (nodeEnv !== 'production' && nodeEnv !== 'test') {
    logger.log(`Swagger docs at http://localhost:${port}/api/v1/docs`);
  }
}
bootstrap();
