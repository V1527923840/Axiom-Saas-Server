import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  HttpStatus,
  HttpCode,
  SerializeOptions,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { AuthGuard } from '@nestjs/passport';

import {
  InfinityPaginationResponse,
  PaginatedApiResponseDto,
} from '../utils/dto/infinity-pagination-response.dto';
import { NullableType } from '../utils/types/nullable.type';
import { FilterUserDto } from './dto/query-user.dto';
import { User } from './domain/user';
import { UsersService } from './users.service';
import { RolesGuard } from '../roles/roles.guard';
import { infinityPagination } from '../utils/infinity-pagination';
import { Menu } from '../menus/domain/menu';

class AssignExtraMenuDto {
  menuId: string;
  expiresAt?: Date;
}

@ApiBearerAuth()
@Roles(RoleEnum.admin)
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiTags('Users')
@Controller({
  path: 'users',
  version: '1',
})
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiCreatedResponse({
    type: User,
  })
  @SerializeOptions({
    groups: ['admin'],
  })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createProfileDto: CreateUserDto): Promise<User> {
    return this.usersService.create(createProfileDto);
  }

  @ApiOkResponse({
    type: InfinityPaginationResponse(User),
  })
  @SerializeOptions({
    groups: ['admin'],
  })
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('tier') tier?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ): Promise<PaginatedApiResponseDto<User>> {
    const pageNum = page ?? 1;
    let limitNum = limit ?? 10;
    if (limitNum > 50) {
      limitNum = 50;
    }

    const filters: FilterUserDto = {};
    if (role) filters.roles = [{ id: role }];
    if (status) filters.status = status;
    if (tier) filters.tier = tier;

    const sort = sortBy
      ? [{ orderBy: sortBy as keyof User, order: sortOrder ?? 'ASC' }]
      : undefined;

    const result = await this.usersService.findManyWithPagination({
      filterOptions: Object.keys(filters).length ? filters : undefined,
      sortOptions: sort ?? undefined,
      paginationOptions: {
        page: pageNum,
        limit: limitNum,
      },
    });

    return infinityPagination(
      result.data,
      { page: pageNum, limit: limitNum },
      result.total,
    ) as PaginatedApiResponseDto<User>;
  }

  @ApiOkResponse({
    type: User,
  })
  @SerializeOptions({
    groups: ['admin'],
  })
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  findOne(@Param('id') id: User['id']): Promise<NullableType<User>> {
    return this.usersService.findById(id);
  }

  @ApiOkResponse({
    type: User,
  })
  @SerializeOptions({
    groups: ['admin'],
  })
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  update(
    @Param('id') id: User['id'],
    @Body() updateProfileDto: UpdateUserDto,
  ): Promise<User | null> {
    return this.usersService.update(id, updateProfileDto);
  }

  @Delete(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: User['id']): Promise<void> {
    return this.usersService.remove(id);
  }

  @ApiOkResponse({
    type: [Menu],
  })
  @SerializeOptions({
    groups: ['admin'],
  })
  @Get(':id/menus')
  @HttpCode(HttpStatus.OK)
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  getUserAllMenus(@Param('id') id: string): Promise<Menu[]> {
    return this.usersService.getUserAllMenus(Number(id));
  }

  @ApiOkResponse({
    type: [Menu],
  })
  @SerializeOptions({
    groups: ['admin'],
  })
  @Get(':id/extra-menus')
  @HttpCode(HttpStatus.OK)
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  getUserExtraMenus(@Param('id') id: string): Promise<Menu[]> {
    return this.usersService.getUserExtraMenus(Number(id));
  }

  @ApiOkResponse()
  @SerializeOptions({
    groups: ['admin'],
  })
  @Post(':id/extra-menus')
  @HttpCode(HttpStatus.CREATED)
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  assignExtraMenu(
    @Param('id') id: string,
    @Body() assignExtraMenuDto: AssignExtraMenuDto,
  ): Promise<void> {
    return this.usersService.assignExtraMenu(
      Number(id),
      assignExtraMenuDto.menuId,
      assignExtraMenuDto.expiresAt,
    );
  }

  @Delete(':id/extra-menus/:menuId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiParam({
    name: 'menuId',
    type: String,
    required: true,
  })
  removeExtraMenu(
    @Param('id') id: string,
    @Param('menuId') menuId: string,
  ): Promise<void> {
    return this.usersService.removeExtraMenu(Number(id), menuId);
  }
}
