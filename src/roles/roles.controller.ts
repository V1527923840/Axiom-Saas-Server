import {
  Controller,
  Get,
  Param,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from './roles.decorator';
import { RoleEnum } from './roles.enum';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from './roles.guard';
import { RoleEntity } from './infrastructure/persistence/relational/entities/role.entity';
import { RolesService } from './roles.service';

@ApiBearerAuth()
@Roles(RoleEnum.admin)
@UseGuards(AuthGuard('jwt'), RolesGuard)
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
  async findAll(): Promise<RoleEntity[]> {
    return this.rolesService.findAll();
  }

  @ApiOkResponse({
    type: RoleEntity,
  })
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: number): Promise<RoleEntity | null> {
    return this.rolesService.findById(id);
  }
}
