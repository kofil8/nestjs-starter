import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { LocalStorage } from './storage/local.storage';
import { S3Storage } from './storage/s3.storage';

@Injectable()
export class UploadService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly localStorage: LocalStorage,
    private readonly s3Storage: S3Storage,
  ) {}

  async uploadFile(
    file: Express.Multer.File,
    userId: string,
    subDirectory = 'general',
  ) {
    const provider = this.configService.get<string>('FILE_STORAGE', 'local');

    const storage = provider === 's3' ? this.s3Storage : this.localStorage;
    const { path, url } = await storage.save(file, subDirectory);

    return this.prisma.file.create({
      data: {
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        path,
        url,
        provider,
        uploadedById: userId,
      },
    });
  }

  async deleteFile(fileId: string) {
    const file = await this.prisma.file.findUnique({ where: { id: fileId } });
    if (!file) return;

    const provider = file.provider;
    const storage = provider === 's3' ? this.s3Storage : this.localStorage;
    await storage.delete(file.path);

    await this.prisma.file.delete({ where: { id: fileId } });
  }

  async getUserFiles(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.file.findMany({
        where: { uploadedById: userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.file.count({ where: { uploadedById: userId } }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
