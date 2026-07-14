import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserExistsPipe } from './pipes/user-exist.pipe';
import { UserService } from './user.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Get()
  findAllUsers(
    @Query() pagination: PaginationDto,
    @Query('search') search?: string,
  ) {
    return this.userService.findAllUsers({ ...pagination, search });
  }

  @Get(':id')
  findUserById(@Param('id', UserExistsPipe) id: string) {
    return this.userService.findUserById(id);
  }

  @Patch(':id')
  updateUserById(
    @Param('id', UserExistsPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.userService.updateUserById(id, updateUserDto, currentUser);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUserById(
    @Param('id', UserExistsPipe) id: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    await this.userService.deleteUserById(id, currentUser);
  }
}
