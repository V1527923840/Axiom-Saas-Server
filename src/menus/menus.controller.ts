import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpStatus,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiParam } from '@nestjs/swagger';
import { CreateMenuDto, UpdateMenuDto, AssignMenusDto } from './dto/menu.dto';
import { AuthGuard } from '@nestjs/passport';
import { NullableType } from '../utils/types/nullable.type';
import { Menu } from './domain/menu';
import { MenusService } from './menus.service';
import { PlansService } from '../plans/plans.service';
import { UsersService } from '../users/users.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@ApiTags('Menus')
@Controller({
  path: 'menus',
  version: '1',
})
export class MenusController {
  constructor(
    private readonly menusService: MenusService,
    private readonly plansService: PlansService,
    private readonly usersService: UsersService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<{ data: Menu[]; total: number; page: number; pageSize: number }> {
    const pageNum = page ?? 1;
    let limitNum = limit ?? 50;
    if (limitNum > 100) {
      limitNum = 100;
    }

    const result = await this.menusService.findMenusWithPagination({
      paginationOptions: {
        page: pageNum,
        limit: limitNum,
      },
    });

    return {
      data: result.data,
      total: result.total,
      page: pageNum,
      pageSize: limitNum,
    };
  }

  @Get('tree')
  @HttpCode(HttpStatus.OK)
  async findTree(@Query('roleId') roleId?: number): Promise<Menu[]> {
    if (roleId) {
      return this.menusService.findTreeByRoleId(roleId);
    }
    // If no roleId, return all menus as tree structure
    return this.menusService.findTree();
  }

  @Get('my')
  @HttpCode(HttpStatus.OK)
  async getMyMenus(@CurrentUser('id') userId: number): Promise<Menu[]> {
    // Delegate to UsersService which merges role menus, plan menus, and user extra menus
    return this.usersService.getUserAllMenus(userId);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', type: String })
  findOne(@Param('id') id: Menu['id']): Promise<NullableType<Menu>> {
    return this.menusService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createDto: CreateMenuDto): Promise<Menu> {
    return this.menusService.create(createDto);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', type: String })
  update(
    @Param('id') id: Menu['id'],
    @Body() updateDto: UpdateMenuDto,
  ): Promise<Menu | null> {
    return this.menusService.update(id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'id', type: String })
  remove(@Param('id') id: Menu['id']): Promise<void> {
    return this.menusService.remove(id);
  }

  // Role menu assignment endpoints

  @Get('roles/:roleId/menus')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'roleId', type: Number })
  async getRoleMenus(@Param('roleId') roleId: number): Promise<Menu[]> {
    return this.menusService.getMenusByRoleId(roleId);
  }

  @Post('roles/:roleId/menus')
  @HttpCode(HttpStatus.CREATED)
  @ApiParam({ name: 'roleId', type: Number })
  assignMenus(
    @Param('roleId') roleId: number,
    @Body() assignDto: AssignMenusDto,
  ): Promise<void> {
    return this.menusService.assignMenusToRole(roleId, assignDto);
  }
}
