import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Post, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import type { JwtPayload } from '../common/decorators/current-user.decorator';
import type { PaginationParams } from '../common/dto/pagination.dto';

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllPosts(
    params: {
      search?: string;
      authorId?: string;
    } & PaginationParams,
  ) {
    const { search, authorId, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.PostWhereInput = {
      deletedAt: null, // Exclude soft-deleted records
    };
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' as const } },
        { content: { contains: search, mode: 'insensitive' as const } },
      ];
    }
    if (authorId) {
      where.authorId = authorId;
    }

    const [data, total] = await Promise.all([
      this.prisma.post.findMany({
        skip,
        take: limit,
        where,
        orderBy: { [sortBy]: sortOrder },
        include: {
          author: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      }),
      this.prisma.post.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPostById(id: string): Promise<Post | null> {
    return this.prisma.post.findFirst({
      where: { id, deletedAt: null },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  async createPost(data: CreatePostDto): Promise<Post> {
    return this.prisma.post.create({ data });
  }

  async updatePost(
    id: string,
    updatedData: UpdatePostDto,
    currentUser: JwtPayload,
  ): Promise<Post> {
    await this.ensureOwnershipOrAdmin(id, currentUser);
    return this.prisma.post.update({
      where: { id, deletedAt: null },
      data: updatedData,
    });
  }

  async deletePost(
    id: string,
    currentUser: JwtPayload,
  ): Promise<void> {
    await this.ensureOwnershipOrAdmin(id, currentUser);
    // Soft-delete: set deletedAt instead of actually deleting
    await this.prisma.post.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private async ensureOwnershipOrAdmin(postId: string, currentUser: JwtPayload) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true },
    });

    if (!post) {
      throw new NotFoundException('Post not found.');
    }

    const isAdmin =
      currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN';
    const isOwner = post.authorId === currentUser.sub;

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException(
        'You do not have permission to modify this post.',
      );
    }
  }
}
