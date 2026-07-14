import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule, QueueModule, MailModule } from './core';
import { AuthModule, UserModule } from './identity';
import { PostsModule } from './content';
import { UploadModule } from './media';
import { HealthModule } from './health/health.module';
import appConfig, { envValidationSchema } from './config/app.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: envValidationSchema,
      load: [appConfig],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get<number>('throttle.ttl', 60) * 1000,
            limit: config.get<number>('throttle.limit', 10),
          },
        ],
      }),
    }),
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        pinoHttp: {
          autoLogging: false,
          level: config.get('app.nodeEnv') === 'production' ? 'info' : 'debug',
          transport:
            config.get('app.nodeEnv') !== 'production'
              ? {
                  target: 'pino-pretty',
                  options: {
                singleLine: true,
                colorize: true,
                translateTime: 'HH:MM:ss.l',
                ignore: 'pid,hostname,context',
                messageFormat: '[{context}] {msg}',
              },
                }
              : undefined,
          serializers: {
            req: () => undefined,
            res: () => undefined,
          },
          redact: {
            paths: [
              'req.headers.authorization',
              'req.headers.cookie',
              'req.headers["set-cookie"]',
              'req.headers["x-forwarded-for"]',
              'req.ip',
            ],
            censor: '[REDACTED]',
          },
        },
      }),
    }),
    PrismaModule,
    UserModule,
    PostsModule,
    AuthModule,
    HealthModule,
    MailModule,
    QueueModule,
    UploadModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
