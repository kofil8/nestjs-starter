import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import * as path from 'path';
import * as fs from 'fs/promises';

@Injectable()
export class LocalStorage {
  private readonly uploadDir: string;

  constructor(private readonly configService: ConfigService) {
    this.uploadDir = this.configService.get<string>('UPLOAD_DIR', './uploads');
  }

  async save(
    file: Express.Multer.File,
    subDirectory = 'general',
  ): Promise<{ path: string; url: string }> {
    const dir = path.join(this.uploadDir, subDirectory);
    await fs.mkdir(dir, { recursive: true });

    const ext = path.extname(file.originalname);
    const filename = `${randomUUID()}${ext}`;
    const filePath = path.join(dir, filename);

    await fs.writeFile(filePath, file.buffer);

    return {
      path: filePath,
      url: `/uploads/${subDirectory}/${filename}`,
    };
  }

  async delete(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch {
      // File already deleted or doesn't exist
    }
  }
}
