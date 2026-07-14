import {
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import type { JwtPayload } from '../common/decorators/current-user.decorator';
import type { PaginationParams } from '../common/dto/pagination.dto';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllUsers(
    params: {
      search?: string;
    } & PaginationParams,
  ) {
    const { search, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = params;
    const skip = (page - 1) * limit;

    const searchCondition: Prisma.UserWhereInput = search
      ? {
          deletedAt: null,
          OR: [
            { firstName: { contains: search, mode: 'insensitive' as const } },
            { lastName: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : { deletedAt: null };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        where: searchCondition,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.user.count({ where: searchCondition }),
    ]);

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findUserById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async updateUserById(
    id: string,
    updateUserDto: UpdateUserDto,
    currentUser: JwtPayload,
  ) {
    this.ensureOwnershipOrAdmin(id, currentUser);

    const data: Prisma.UserUpdateInput = {};
    if (updateUserDto.email) data.email = updateUserDto.email;
    if (updateUserDto.firstName) data.firstName = updateUserDto.firstName;
    if (updateUserDto.lastName) data.lastName = updateUserDto.lastName;

    return this.prisma.user.update({
      where: { id, deletedAt: null },
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async deleteUserById(
    id: string,
    currentUser: JwtPayload,
  ): Promise<void> {
    this.ensureOwnershipOrAdmin(id, currentUser);
    // Soft-delete: set deletedAt instead of actually deleting
    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private ensureOwnershipOrAdmin(resourceId: string, currentUser: JwtPayload) {
    const isAdmin =
      currentUser.role === Role.ADMIN || currentUser.role === Role.SUPER_ADMIN;
    const isOwner = currentUser.sub === resourceId;

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException(
        'You do not have permission to perform this action on this resource.',
      );
    }
  }
}
