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
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../roles/roles.guard';
import { NullableType } from '../utils/types/nullable.type';
import { Menu } from './domain/menu';
import { MenusService } from './menus.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiBearerAuth()
@Roles(RoleEnum.admin)
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiTags('Menus')
@Controller({
  path: 'menus',
  version: '1',
})
export class MenusController {
  constructor(private readonly menusService: MenusService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<{ data: Menu[]; total: number }> {
    const pageNum = page ?? 1;
    let limitNum = limit ?? 50;
    if (limitNum > 100) {
      limitNum = 100;
    }

    return this.menusService.findMenusWithPagination({
      paginationOptions: {
        page: pageNum,
        limit: limitNum,
      },
    });
  }

  @Get('tree')
  @HttpCode(HttpStatus.OK)
  async findTree(@Query('roleId') roleId?: number): Promise<Menu[]> {
    if (roleId) {
      return this.menusService.findTreeByRoleId(roleId);
    }
    // If no roleId, return all menus without filtering
    return this.menusService.findAll();
  }

  @Get('my')
  @HttpCode(HttpStatus.OK)
  async getMyMenus(@CurrentUser('role') role: { id: number }): Promise<Menu[]> {
    // Use role.id from JWT payload to get menus for this role
    return this.menusService.findTreeByRoleId(role.id);
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
