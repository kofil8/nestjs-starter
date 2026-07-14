import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { LocalStorage } from './storage/local.storage';
import { S3Storage } from './storage/s3.storage';

@Module({
  imports: [
    MulterModule.register({
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
    ConfigModule,
    PrismaModule,
  ],
  controllers: [UploadController],
  providers: [UploadService, LocalStorage, S3Storage],
  exports: [UploadService],
})
export class UploadModule {}
