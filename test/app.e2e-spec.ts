import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { AllExceptionsFilter } from './../src/common/filters/all-exceptions.filter';
import { TransformInterceptor } from './../src/common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './../src/common/interceptors/logging.interceptor';
import cookieParser from 'cookie-parser';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply same global configuration as main.ts
    app.use(cookieParser());
    app.setGlobalPrefix('api');
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
      prefix: 'v',
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalInterceptors(
      new LoggingInterceptor(),
      new TransformInterceptor(),
    );
    app.useGlobalFilters(new AllExceptionsFilter());

    await app.init();
  });

  it('GET /api/v1 returns welcome message wrapped in standard response', () => {
    return request(app.getHttpServer())
      .get('/api/v1')
      .expect(200)
      .expect((res) => {
        expect(res.body.success).toBe(true);
        expect(res.body.statusCode).toBe(200);
        expect(res.body.message).toBe('Data fetched successfully');
        expect(res.body.data).toContain('Welcome to');
      });
  });

  it('GET / returns 404 (no route without prefix)', () => {
    return request(app.getHttpServer()).get('/').expect(404);
  });

  afterAll(async () => {
    await app.close();
  });
});
