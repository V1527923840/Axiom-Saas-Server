import { Injectable } from '@nestjs/common';
import { CreateConsumptionDto } from './dto/consumption.dto';
import { NullableType } from '../utils/types/nullable.type';
import {
  FilterConsumptionDto,
  QueryConsumptionDto,
  SortConsumptionDto,
} from './dto/query-consumption.dto';
import { ConsumptionRepository } from './infrastructure/persistence/consumption.repository';
import { Consumption } from './domain/consumption';

@Injectable()
export class ConsumptionsService {
  constructor(private readonly consumptionRepository: ConsumptionRepository) {}

  async createConsumption(
    createDto: CreateConsumptionDto,
  ): Promise<Consumption> {
    return this.consumptionRepository.create({
      userId: createDto.userId,
      userName: createDto.userName,
      userEmail: createDto.userEmail,
      consumeType: createDto.consumeType,
      points: createDto.points,
      balance: createDto.balance,
      businessId: createDto.businessId ?? null,
      businessType: createDto.businessType ?? null,
      description: createDto.description ?? null,
    });
  }

  findConsumptionsWithPagination(query: QueryConsumptionDto): Promise<{
    data: Consumption[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = query.page ?? 1;
    const limit = query.pageSize ?? 10;

    const filters: FilterConsumptionDto = {};
    if (query.userName) filters.userName = query.userName;
    if (query.userEmail) filters.userEmail = query.userEmail;
    if (query.consumeType) filters.consumeType = query.consumeType;
    if (query.dateFrom) filters.dateFrom = query.dateFrom;
    if (query.dateTo) filters.dateTo = query.dateTo;

    const sort: SortConsumptionDto[] | undefined = query.sortBy
      ? [
          {
            orderBy: query.sortBy as keyof Consumption,
            order: query.sortOrder ?? 'ASC',
          },
        ]
      : undefined;

    return this.consumptionRepository
      .findManyWithPagination({
        filterOptions: Object.keys(filters).length ? filters : undefined,
        sortOptions: sort ?? undefined,
        paginationOptions: { page, limit },
      })
      .then((result) => ({ ...result, page, limit }));
  }

  findConsumptionById(
    id: Consumption['id'],
  ): Promise<NullableType<Consumption>> {
    return this.consumptionRepository.findById(id);
  }
}
