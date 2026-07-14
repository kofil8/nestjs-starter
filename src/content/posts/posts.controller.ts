import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostExistsPipe } from './pipes/post-exists.pipe';
import { PostsService } from './posts.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  @Public()
  async getAllPosts(
    @Query() pagination: PaginationDto,
    @Query('search') search?: string,
    @Query('authorId') authorId?: string,
  ) {
    return this.postsService.getAllPosts({ ...pagination, search, authorId });
  }

  @Get(':id')
  async getPostById(@Param('id', PostExistsPipe) id: string) {
    return this.postsService.getPostById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createPost(
    @Body() postData: CreatePostDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.postsService.createPost({
      ...postData,
      authorId: currentUser.sub,
    });
  }

  @Patch(':id')
  async updatePost(
    @Param('id', PostExistsPipe) id: string,
    @Body() updatedData: UpdatePostDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.postsService.updatePost(id, updatedData, currentUser);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePost(
    @Param('id', PostExistsPipe) id: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    await this.postsService.deletePost(id, currentUser);
  }
}
