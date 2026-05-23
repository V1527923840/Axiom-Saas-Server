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
import { FilterPaymentFlowDto } from './dto/query-payment-flow.dto';
import { FilterConsumptionDto } from './dto/query-consumption.dto';
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
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('userName') userName?: string,
    @Query('userEmail') userEmail?: string,
    @Query('type') type?: string,
    @Query('paymentMethod') paymentMethod?: string,
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ): Promise<PaginatedApiResponseDto<PaymentFlow>> {
    const pageNum = page ?? 1;
    let limitNum = limit ?? 10;
    if (limitNum > 100) {
      limitNum = 100;
    }

    const filters: FilterPaymentFlowDto = {};
    if (userName) filters.userName = userName;
    if (userEmail) filters.userEmail = userEmail;
    if (type) filters.type = type as FilterPaymentFlowDto['type'];
    if (paymentMethod)
      filters.paymentMethod =
        paymentMethod as FilterPaymentFlowDto['paymentMethod'];
    if (status) filters.status = status as FilterPaymentFlowDto['status'];
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;

    const sort = sortBy
      ? [{ orderBy: sortBy as keyof PaymentFlow, order: sortOrder ?? 'ASC' }]
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
    ) as PaginatedApiResponseDto<PaymentFlow>;
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
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('userName') userName?: string,
    @Query('userEmail') userEmail?: string,
    @Query('consumeType') consumeType?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ): Promise<PaginatedApiResponseDto<Consumption>> {
    const pageNum = page ?? 1;
    let limitNum = limit ?? 10;
    if (limitNum > 100) {
      limitNum = 100;
    }

    const filters: FilterConsumptionDto = {};
    if (userName) filters.userName = userName;
    if (userEmail) filters.userEmail = userEmail;
    if (consumeType)
      filters.consumeType = consumeType as FilterConsumptionDto['consumeType'];
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;

    const sort = sortBy
      ? [{ orderBy: sortBy as keyof Consumption, order: sortOrder ?? 'ASC' }]
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
    ) as PaginatedApiResponseDto<Consumption>;
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
