import { Injectable } from '@nestjs/common';
import { CreateConsumptionDto } from './dto/consumption.dto';
import { NullableType } from '../utils/types/nullable.type';
import {
  FilterConsumptionDto,
  SortConsumptionDto,
} from './dto/query-consumption.dto';
import { ConsumptionRepository } from './infrastructure/persistence/consumption.repository';
import { Consumption } from './domain/consumption';
import { IPaginationOptions } from '../utils/types/pagination-options';

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

  findConsumptionsWithPagination({
    filterOptions,
    sortOptions,
    paginationOptions,
  }: {
    filterOptions?: FilterConsumptionDto | null;
    sortOptions?: SortConsumptionDto[] | null;
    paginationOptions: IPaginationOptions;
  }) {
    return this.consumptionRepository.findManyWithPagination({
      filterOptions,
      sortOptions,
      paginationOptions,
    });
  }

  findConsumptionById(
    id: Consumption['id'],
  ): Promise<NullableType<Consumption>> {
    return this.consumptionRepository.findById(id);
  }
}
