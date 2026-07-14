import {
  ArgumentMetadata,
  Injectable,
  BadRequestException,
  NotFoundException,
  PipeTransform,
} from '@nestjs/common';
import { validate as isUUID } from 'uuid';
import { PostsService } from '../posts.service';

@Injectable()
export class PostExistsPipe implements PipeTransform {
  constructor(private readonly postService: PostsService) {}

  async transform(
    value: string,
    metadata: ArgumentMetadata,
  ): Promise<string> {
    if (!isUUID(value)) {
      throw new BadRequestException(
        `Invalid UUID format for parameter '${metadata.data || 'id'}'`,
      );
    }

    const post = await this.postService.getPostById(value);

    if (!post) {
      throw new NotFoundException(`Post with ID ${value} not found.`);
    }

    return value;
  }
}
