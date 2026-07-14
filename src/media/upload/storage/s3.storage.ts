import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class S3Storage {
  constructor(private readonly configService: ConfigService) {}

  async save(
    file: Express.Multer.File,
    subDirectory = 'general',
  ): Promise<{ path: string; url: string }> {
    // TODO: Replace with actual AWS S3 SDK integration
    // const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
    // const client = new S3Client({
    //   region: this.configService.get<string>('AWS_REGION'),
    //   credentials: {
    //     accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID'),
    //     secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY'),
    //   },
    // });
    //
    // const key = `${subDirectory}/${Date.now()}-${file.originalname}`;
    // await client.send(new PutObjectCommand({
    //   Bucket: this.configService.get<string>('S3_BUCKET'),
    //   Key: key,
    //   Body: file.buffer,
    //   ContentType: file.mimetype,
    // }));

    const key = `${subDirectory}/${Date.now()}-${file.originalname}`;
    return {
      path: key,
      url: `https://${this.configService.get<string>('S3_BUCKET')}.s3.amazonaws.com/${key}`,
    };
  }

  async delete(filePath: string): Promise<void> {
    // TODO: Implement S3 delete
    // const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
  }
}
