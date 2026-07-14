import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { validate as isUUID } from 'uuid';

@Injectable()
export class UUIDValidationPipe implements PipeTransform<string> {
  transform(value: string, metadata: ArgumentMetadata): string {
    if (!isUUID(value)) {
      throw new BadRequestException(
        `Invalid UUID format for parameter '${metadata.data || 'id'}': ${value}`,
      );
    }
    return value;
  }
}
