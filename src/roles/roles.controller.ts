import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpStatus,
  HttpCode,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiTags,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { MenuAccessGuard } from '../menus/menu-access.guard';
import { MenuPaths } from '../menus/menu-paths.decorator';
import { RoleEntity } from './infrastructure/persistence/relational/entities/role.entity';
import { RolesService } from './roles.service';
import { CreateRoleDto, UpdateRoleDto, AssignUsersDto } from './dto/role.dto';

@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), MenuAccessGuard)
@ApiTags('Roles')
@Controller({
  path: 'roles',
  version: '1',
})
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @ApiOkResponse({
    type: [RoleEntity],
  })
  @Get()
  @HttpCode(HttpStatus.OK)
  @MenuPaths('/roles')
  async findAll(): Promise<{ data: RoleEntity[] }> {
    const roles = await this.rolesService.findAll();
    return { data: roles };
  }

  @ApiOkResponse({
    type: RoleEntity,
  })
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<RoleEntity | null> {
    return this.rolesService.findById(id);
  }

  @ApiCreatedResponse({
    type: RoleEntity,
  })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateRoleDto): Promise<RoleEntity> {
    return this.rolesService.create(dto);
  }

  @ApiOkResponse({
    type: RoleEntity,
  })
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRoleDto,
  ): Promise<RoleEntity | null> {
    return this.rolesService.update(id, dto);
  }

  @ApiOkResponse()
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.rolesService.delete(id);
  }

  @ApiOkResponse()
  @Post(':roleId/users')
  @HttpCode(HttpStatus.CREATED)
  async assignUsers(
    @Param('roleId', ParseIntPipe) roleId: number,
    @Body() dto: AssignUsersDto,
  ): Promise<void> {
    await this.rolesService.assignUsersToRole(roleId, dto.userIds);
  }

  @ApiOkResponse()
  @Get(':roleId/users')
  @HttpCode(HttpStatus.OK)
  async getRoleUsers(
    @Param('roleId', ParseIntPipe) roleId: number,
  ): Promise<{ data: number[] }> {
    const userIds = await this.rolesService.getRoleUserIds(roleId);
    return { data: userIds };
  }
}
