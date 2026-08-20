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
import {
  FilterSubscriptionDto,
  QuerySubscriptionDto,
} from './dto/query-subscription.dto';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { MenuAccessGuard } from '../menus/menu-access.guard';
import { MenuPaths } from '../menus/menu-paths.decorator';

import {
  InfinityPaginationResponse,
  PaginatedApiResponseDto,
} from '../utils/dto/infinity-pagination-response.dto';
import { NullableType } from '../utils/types/nullable.type';
import { Subscription } from './domain/subscription';
import { SubscriptionsService } from './subscriptions.service';
import { infinityPagination } from '../utils/infinity-pagination';

/**
 * Minimal user shape on the JWT-authenticated request. Matches the pattern
 * used in skills.controller.ts (B2 audit). Keeps the controller import-graph
 * small without pulling in the full users module here.
 */
interface AuthedRequest extends Request {
  user: { id: number | string };
}

@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), MenuAccessGuard)
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
    @Request() req: AuthedRequest,
  ): Promise<Subscription> {
    const userId = String(req.user.id);
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
  @MenuPaths('/subscriptions')
  async findAll(
    @Query() query: QuerySubscriptionDto,
  ): Promise<PaginatedApiResponseDto<Subscription>> {
    const pageNum = query.page ?? 1;
    const limitNum = query.pageSize ?? 10;

    const filters: FilterSubscriptionDto = {};
    if (query.status) filters.status = query.status;
    if (query.userId) filters.userId = query.userId;

    const sort = query.sortBy
      ? [
          {
            orderBy: query.sortBy as keyof Subscription,
            order: query.sortOrder ?? 'ASC',
          },
        ]
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
    );
  }

  @Get('current')
  @HttpCode(HttpStatus.OK)
  async getCurrentSubscription(@Request() req: AuthedRequest): Promise<any> {
    const userId = String(req.user.id);
    return this.subscriptionsService.getCurrentSubscription(userId);
  }

  @Post('upgrade')
  @HttpCode(HttpStatus.OK)
  async upgrade(
    @Body() upgradeSubscriptionDto: UpgradeSubscriptionDto,
    @Request() req: AuthedRequest,
  ): Promise<any> {
    const userId = String(req.user.id);
    return this.subscriptionsService.upgrade(upgradeSubscriptionDto, userId);
  }

  @Get('history')
  @HttpCode(HttpStatus.OK)
  async getHistory(
    @Request() req: AuthedRequest,
    @Query() query: QuerySubscriptionDto,
  ): Promise<PaginatedApiResponseDto<Subscription>> {
    const userId = String(req.user.id);
    const pageNum = query.page ?? 1;
    const limitNum = query.pageSize ?? 10;

    const result = await this.subscriptionsService.findByUserId(userId);
    return infinityPagination(
      result.data,
      { page: pageNum, limit: limitNum },
      result.total,
    );
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
  @MenuPaths('/subscriptions')
  remove(@Param('id') id: Subscription['id']): Promise<void> {
    return this.subscriptionsService.remove(id);
  }
}
