import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { FindOptionsWhere, Repository, Between } from 'typeorm';
import { ConsumptionEntity } from '../entities/consumption.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import {
  FilterConsumptionDto,
  SortConsumptionDto,
} from '../../../../dto/query-consumption.dto';
import { Consumption } from '../../../../domain/consumption';
import { ConsumptionRepository } from '../../consumption.repository';
import { ConsumptionMapper } from '../mappers/consumption.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class ConsumptionRelationalRepository implements ConsumptionRepository {
  constructor(
    @InjectRepository(ConsumptionEntity)
    private readonly repository: Repository<ConsumptionEntity>,
  ) {}

  async create(
    data: Omit<Consumption, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Consumption> {
    const persistenceModel = ConsumptionMapper.toPersistence(data);
    const newEntity = await this.repository.save(
      this.repository.create(persistenceModel),
    );
    return ConsumptionMapper.toDomain(newEntity);
  }

  async findManyWithPagination({
    filterOptions,
    sortOptions,
    paginationOptions,
  }: {
    filterOptions?: FilterConsumptionDto | null;
    sortOptions?: SortConsumptionDto[] | null;
    paginationOptions: IPaginationOptions;
  }): Promise<{ data: Consumption[]; total: number }> {
    const where: FindOptionsWhere<ConsumptionEntity> = {};

    if (filterOptions?.userId) {
      where.userId = filterOptions.userId;
    }

    if (filterOptions?.userName) {
      where.userName = filterOptions.userName;
    }

    if (filterOptions?.userEmail) {
      where.userEmail = filterOptions.userEmail;
    }

    if (filterOptions?.consumeType) {
      where.consumeType = filterOptions.consumeType;
    }

    if (filterOptions?.dateFrom && filterOptions?.dateTo) {
      where.createdAt = Between(
        new Date(filterOptions.dateFrom),
        new Date(filterOptions.dateTo),
      );
    }

    const [entities, total] = await this.repository.findAndCount({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
      where: where,
      order: sortOptions?.reduce(
        (accumulator, sort) => ({
          ...accumulator,
          [sort.orderBy]: sort.order,
        }),
        {},
      ),
    });

    return {
      data: entities.map((entity) => ConsumptionMapper.toDomain(entity)),
      total,
    };
  }

  async findById(id: Consumption['id']): Promise<NullableType<Consumption>> {
    const entity = await this.repository.findOne({
      where: { id: id as string },
    });

    return entity ? ConsumptionMapper.toDomain(entity) : null;
  }
}
