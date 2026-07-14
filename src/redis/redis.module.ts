import { Global, Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: (configService: ConfigService) => {
        const logger = new Logger('RedisService');

        const redisOptions: import('ioredis').RedisOptions = {
          host: configService.get<string>('redis.host', '127.0.0.1'),
          port: configService.get<number>('redis.port', 6379),
        };

        const password = configService.get<string>('redis.password');
        if (password) {
          redisOptions.password = password;
        }

        const tls = configService.get<boolean>('redis.tls');
        if (tls) {
          redisOptions.tls = {};
        }

        const client = new Redis(redisOptions);

        client.on('connect', () => {
          logger.log('🚀 Redis connected successfully!');
        });

        client.on('error', (err) => {
          logger.error('❌ Redis connection error:', err);
        });

        return client;
      },
      inject: [ConfigService],
    },
  ],
  exports: ['REDIS_CLIENT'],
})
export class RedisModule {}
