import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { FindOptionsWhere, Repository, In } from 'typeorm';
import { SubscriptionEntity } from '../entities/subscription.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import {
  FilterSubscriptionDto,
  SortSubscriptionDto,
} from '../../../../dto/query-subscription.dto';
import { Subscription } from '../../../../domain/subscription';
import { SubscriptionRepository } from '../../subscription.repository';
import { SubscriptionMapper } from '../mappers/subscription.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class SubscriptionsRelationalRepository implements SubscriptionRepository {
  constructor(
    @InjectRepository(SubscriptionEntity)
    private readonly subscriptionsRepository: Repository<SubscriptionEntity>,
  ) {}

  async create(data: Subscription): Promise<Subscription> {
    const persistenceModel = SubscriptionMapper.toPersistence(data);
    const newEntity = await this.subscriptionsRepository.save(
      this.subscriptionsRepository.create(persistenceModel),
    );
    return SubscriptionMapper.toDomain(newEntity);
  }

  async findManyWithPagination({
    filterOptions,
    sortOptions,
    paginationOptions,
  }: {
    filterOptions?: FilterSubscriptionDto | null;
    sortOptions?: SortSubscriptionDto[] | null;
    paginationOptions: IPaginationOptions;
  }): Promise<{ data: Subscription[]; total: number }> {
    const where: FindOptionsWhere<SubscriptionEntity> = {};
    if (filterOptions?.status) {
      where.status = filterOptions.status;
    }
    if (filterOptions?.userId) {
      where.userId = Number(filterOptions.userId);
    }

    const [entities, total] = await this.subscriptionsRepository.findAndCount({
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
      data: entities.map((subscription) =>
        SubscriptionMapper.toDomain(subscription),
      ),
      total,
    };
  }

  async findById(id: Subscription['id']): Promise<NullableType<Subscription>> {
    const entity = await this.subscriptionsRepository.findOne({
      where: { id: id as string },
    });

    return entity ? SubscriptionMapper.toDomain(entity) : null;
  }

  async findByIds(ids: Subscription['id'][]): Promise<Subscription[]> {
    const entities = await this.subscriptionsRepository.find({
      where: { id: In(ids as string[]) },
    });

    return entities.map((subscription) =>
      SubscriptionMapper.toDomain(subscription),
    );
  }

  async findActiveByUserId(
    userId: string,
  ): Promise<NullableType<Subscription>> {
    const entity = await this.subscriptionsRepository.findOne({
      where: { userId: Number(userId), status: 'active' },
      order: { subscribedAt: 'DESC' },
    });

    return entity ? SubscriptionMapper.toDomain(entity) : null;
  }

  async findByUserId(
    userId: string,
  ): Promise<{ data: Subscription[]; total: number }> {
    const [entities, total] = await this.subscriptionsRepository.findAndCount({
      where: { userId: Number(userId) },
      order: { subscribedAt: 'DESC' },
    });

    return {
      data: entities.map((subscription) =>
        SubscriptionMapper.toDomain(subscription),
      ),
      total,
    };
  }

  async update(
    id: Subscription['id'],
    payload: Partial<Subscription>,
  ): Promise<Subscription | null> {
    const entity = await this.subscriptionsRepository.findOne({
      where: { id: id as string },
    });

    if (!entity) {
      return null;
    }

    const updatedEntity = await this.subscriptionsRepository.save(
      this.subscriptionsRepository.create(
        SubscriptionMapper.toPersistence({
          ...SubscriptionMapper.toDomain(entity),
          ...payload,
        }),
      ),
    );

    return SubscriptionMapper.toDomain(updatedEntity);
  }

  async remove(id: Subscription['id']): Promise<void> {
    await this.subscriptionsRepository.softDelete(id as string);
  }
}
