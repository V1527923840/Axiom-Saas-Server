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
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { FilterPlanDto } from './dto/query-plan.dto';
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
import { Plan } from './domain/plan';
import { PlansService } from './plans.service';
import { RolesGuard } from '../roles/roles.guard';
import { infinityPagination } from '../utils/infinity-pagination';
import { AssignMenusDto } from '../menus/dto/menu.dto';
import { Menu } from '../menus/domain/menu';

@ApiBearerAuth()
@Roles(RoleEnum.admin)
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiTags('Plans')
@Controller({
  path: 'plans',
  version: '1',
})
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @ApiCreatedResponse({
    type: Plan,
  })
  @SerializeOptions({
    groups: ['admin'],
  })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createPlanDto: CreatePlanDto): Promise<Plan> {
    return this.plansService.create(createPlanDto);
  }

  @ApiOkResponse({
    type: InfinityPaginationResponse(Plan),
  })
  @SerializeOptions({
    groups: ['admin'],
  })
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('cycle') cycle?: string,
    @Query('tier') tier?: string,
    @Query('status') status?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ): Promise<PaginatedApiResponseDto<Plan>> {
    const pageNum = page ?? 1;
    let limitNum = limit ?? 10;
    if (limitNum > 50) {
      limitNum = 50;
    }

    const filters: FilterPlanDto = {};
    if (cycle) filters.cycle = cycle;
    if (tier) filters.tier = tier;
    if (status) filters.status = status;

    const sort = sortBy
      ? [{ orderBy: sortBy as keyof Plan, order: sortOrder ?? 'ASC' }]
      : undefined;

    const result = await this.plansService.findManyWithPagination({
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
    ) as PaginatedApiResponseDto<Plan>;
  }

  @ApiOkResponse({
    type: Plan,
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
  findOne(@Param('id') id: Plan['id']): Promise<NullableType<Plan>> {
    return this.plansService.findById(id);
  }

  @ApiOkResponse({
    type: Plan,
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
    @Param('id') id: Plan['id'],
    @Body() updatePlanDto: UpdatePlanDto,
  ): Promise<Plan | null> {
    return this.plansService.update(id, updatePlanDto);
  }

  @Delete(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: Plan['id']): Promise<void> {
    return this.plansService.remove(id);
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
  getPlanMenus(@Param('id') id: string): Promise<Menu[]> {
    return this.plansService.getPlanMenus(id);
  }

  @ApiOkResponse({
    type: [Menu],
  })
  @SerializeOptions({
    groups: ['admin'],
  })
  @Post(':id/menus')
  @HttpCode(HttpStatus.OK)
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  assignMenusToPlan(
    @Param('id') id: string,
    @Body() assignMenusDto: AssignMenusDto,
  ): Promise<void> {
    return this.plansService.assignMenusToPlan(id, assignMenusDto.menuIds);
  }
}
