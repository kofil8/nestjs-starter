import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { EmailProcessor } from './processors/email.processor';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('redis.host', '127.0.0.1'),
          port: config.get<number>('redis.port', 6379),
        },
      }),
    }),
    BullModule.registerQueue({
      name: 'email',
    }),
    MailModule,
  ],
  providers: [EmailProcessor],
  exports: [BullModule],
})
export class QueueModule {}
