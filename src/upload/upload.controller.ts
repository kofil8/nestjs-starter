import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/decorators/current-user.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { UUIDValidationPipe } from '../common/pipes/uuid-validation.pipe';

// Allowed MIME types for file uploads
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/json',
  'text/plain',
  'text/csv',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

@Controller('uploads')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided. Please upload a file.');
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type ${file.mimetype} is not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`,
      );
    }

    return this.uploadService.uploadFile(file, user.sub);
  }

  @Get()
  async list(
    @CurrentUser() user: JwtPayload,
    @Query() pagination: PaginationDto,
  ) {
    return this.uploadService.getUserFiles(user.sub, pagination.page, pagination.limit);
  }

  @Delete(':id')
  async delete(
    @Param('id', UUIDValidationPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.uploadService.deleteFile(id);
  }
}
