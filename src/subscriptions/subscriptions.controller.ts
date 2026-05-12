import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Query,
  HttpStatus,
  HttpCode,
  SerializeOptions,
  Request,
} from '@nestjs/common';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpgradeSubscriptionDto } from './dto/upgrade-subscription.dto';
import { FilterSubscriptionDto } from './dto/query-subscription.dto';
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
import { Subscription } from './domain/subscription';
import { SubscriptionsService } from './subscriptions.service';
import { RolesGuard } from '../roles/roles.guard';
import { infinityPagination } from '../utils/infinity-pagination';

@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@ApiTags('Subscriptions')
@Controller({
  path: 'subscriptions',
  version: '1',
})
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @ApiCreatedResponse({
    type: Subscription,
  })
  @SerializeOptions({
    groups: ['admin'],
  })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() createSubscriptionDto: CreateSubscriptionDto,
    @Request() req: any,
  ): Promise<Subscription> {
    const userId = req.user.id;
    return this.subscriptionsService.create(createSubscriptionDto, userId);
  }

  @ApiOkResponse({
    type: InfinityPaginationResponse(Subscription),
  })
  @SerializeOptions({
    groups: ['admin'],
  })
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('userId') userId?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ): Promise<PaginatedApiResponseDto<Subscription>> {
    const pageNum = page ?? 1;
    let limitNum = limit ?? 10;
    if (limitNum > 50) {
      limitNum = 50;
    }

    const filters: FilterSubscriptionDto = {};
    if (status) filters.status = status;
    if (userId) filters.userId = userId;

    const sort = sortBy
      ? [{ orderBy: sortBy as keyof Subscription, order: sortOrder ?? 'ASC' }]
      : undefined;

    const result = await this.subscriptionsService.findManyWithPagination({
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
    ) as PaginatedApiResponseDto<Subscription>;
  }

  @Get('current')
  @HttpCode(HttpStatus.OK)
  async getCurrentSubscription(@Request() req: any): Promise<any> {
    const userId = req.user.id;
    return this.subscriptionsService.getCurrentSubscription(userId);
  }

  @Post('upgrade')
  @HttpCode(HttpStatus.OK)
  async upgrade(
    @Body() upgradeSubscriptionDto: UpgradeSubscriptionDto,
    @Request() req: any,
  ): Promise<any> {
    const userId = req.user.id;
    return this.subscriptionsService.upgrade(upgradeSubscriptionDto, userId);
  }

  @Get('history')
  @HttpCode(HttpStatus.OK)
  async getHistory(
    @Request() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<PaginatedApiResponseDto<Subscription>> {
    const userId = req.user.id;
    const pageNum = page ?? 1;
    let limitNum = limit ?? 10;
    if (limitNum > 50) {
      limitNum = 50;
    }

    const result = await this.subscriptionsService.findByUserId(userId);
    return infinityPagination(
      result.data,
      { page: pageNum, limit: limitNum },
      result.total,
    ) as PaginatedApiResponseDto<Subscription>;
  }

  @ApiOkResponse({
    type: Subscription,
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
  findOne(
    @Param('id') id: Subscription['id'],
  ): Promise<NullableType<Subscription>> {
    return this.subscriptionsService.findById(id);
  }

  @Delete(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(RoleEnum.admin)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  remove(@Param('id') id: Subscription['id']): Promise<void> {
    return this.subscriptionsService.remove(id);
  }
}
