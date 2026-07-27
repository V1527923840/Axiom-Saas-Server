import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  HttpStatus,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiParam } from '@nestjs/swagger';
import {
  CreatePaymentFlowDto,
  UpdatePaymentFlowDto,
} from './dto/payment-flow.dto';
import { CreateConsumptionDto } from './dto/consumption.dto';
import {
  FilterPaymentFlowDto,
  QueryPaymentFlowDto,
} from './dto/query-payment-flow.dto';
import {
  FilterConsumptionDto,
  QueryConsumptionDto,
} from './dto/query-consumption.dto';
import { AuthGuard } from '@nestjs/passport';
import { MenuAccessGuard } from '../menus/menu-access.guard';
import { MenuPaths } from '../menus/menu-paths.decorator';
import { infinityPagination } from '../utils/infinity-pagination';
import { PaginatedApiResponseDto } from '../utils/dto/infinity-pagination-response.dto';
import { NullableType } from '../utils/types/nullable.type';
import { PaymentFlow } from './domain/payment-flow';
import { Consumption } from './domain/consumption';
import { BillsService } from './bills.service';
import { ConsumptionsService } from './consumptions.service';

@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), MenuAccessGuard)
@ApiTags('Bills')
@Controller({
  path: 'bills',
  version: '1',
})
export class BillsController {
  constructor(
    private readonly billsService: BillsService,
    private readonly consumptionsService: ConsumptionsService,
  ) {}

  // Payment Flow endpoints

  @Post('flows')
  @HttpCode(HttpStatus.CREATED)
  createFlow(@Body() createDto: CreatePaymentFlowDto): Promise<PaymentFlow> {
    return this.billsService.createPaymentFlow(createDto);
  }

  @Get('flows')
  @HttpCode(HttpStatus.OK)
  @MenuPaths('/bills/flows')
  async findAllFlows(
    @Query() query: QueryPaymentFlowDto,
  ): Promise<PaginatedApiResponseDto<PaymentFlow>> {
    const pageNum = query.page ?? 1;
    const limitNum = query.pageSize ?? 10;

    const filters: FilterPaymentFlowDto = {};
    if (query.userName) filters.userName = query.userName;
    if (query.userEmail) filters.userEmail = query.userEmail;
    if (query.type) filters.type = query.type;
    if (query.paymentMethod) filters.paymentMethod = query.paymentMethod;
    if (query.status) filters.status = query.status;
    if (query.dateFrom) filters.dateFrom = query.dateFrom;
    if (query.dateTo) filters.dateTo = query.dateTo;

    const sort = query.sortBy
      ? [
          {
            orderBy: query.sortBy as keyof PaymentFlow,
            order: query.sortOrder ?? 'ASC',
          },
        ]
      : undefined;

    const result = await this.billsService.findPaymentFlowsWithPagination({
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

  @Get('flows/:id')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', type: String })
  findOneFlow(
    @Param('id') id: PaymentFlow['id'],
  ): Promise<NullableType<PaymentFlow>> {
    return this.billsService.findPaymentFlowById(id);
  }

  @Patch('flows/:id')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', type: String })
  updateFlow(
    @Param('id') id: PaymentFlow['id'],
    @Body() updateDto: UpdatePaymentFlowDto,
  ): Promise<PaymentFlow | null> {
    return this.billsService.updatePaymentFlow(id, updateDto);
  }

  // Consumption endpoints

  @Post('consumptions')
  @HttpCode(HttpStatus.CREATED)
  createConsumption(
    @Body() createDto: CreateConsumptionDto,
  ): Promise<Consumption> {
    return this.consumptionsService.createConsumption(createDto);
  }

  @Get('consumptions')
  @HttpCode(HttpStatus.OK)
  async findAllConsumptions(
    @Query() query: QueryConsumptionDto,
  ): Promise<PaginatedApiResponseDto<Consumption>> {
    const pageNum = query.page ?? 1;
    const limitNum = query.pageSize ?? 10;

    const filters: FilterConsumptionDto = {};
    if (query.userName) filters.userName = query.userName;
    if (query.userEmail) filters.userEmail = query.userEmail;
    if (query.consumeType) filters.consumeType = query.consumeType;
    if (query.dateFrom) filters.dateFrom = query.dateFrom;
    if (query.dateTo) filters.dateTo = query.dateTo;

    const sort = query.sortBy
      ? [
          {
            orderBy: query.sortBy as keyof Consumption,
            order: query.sortOrder ?? 'ASC',
          },
        ]
      : undefined;

    const result =
      await this.consumptionsService.findConsumptionsWithPagination({
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

  @Get('consumptions/:id')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', type: String })
  findOneConsumption(
    @Param('id') id: Consumption['id'],
  ): Promise<NullableType<Consumption>> {
    return this.consumptionsService.findConsumptionById(id);
  }
}
