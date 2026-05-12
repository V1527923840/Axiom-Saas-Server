import { Injectable } from '@nestjs/common';

import { NullableType } from '../../../../../utils/types/nullable.type';
import {
  FilterSubscriptionDto,
  SortSubscriptionDto,
} from '../../../../dto/query-subscription.dto';
import { Subscription } from '../../../../domain/subscription';
import { SubscriptionRepository } from '../../subscription.repository';
import { SubscriptionSchemaClass } from '../entities/subscription.schema';
import { InjectModel } from '@nestjs/mongoose';
import { QueryFilter, Model } from 'mongoose';
import { SubscriptionMapper } from '../mappers/subscription.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class SubscriptionsDocumentRepository implements SubscriptionRepository {
  constructor(
    @InjectModel(SubscriptionSchemaClass.name)
    private readonly subscriptionsModel: Model<SubscriptionSchemaClass>,
  ) {}

  async create(data: Subscription): Promise<Subscription> {
    const persistenceModel = SubscriptionMapper.toPersistence(data);
    const createdSubscription = new this.subscriptionsModel(persistenceModel);
    const subscriptionObject = await createdSubscription.save();
    return SubscriptionMapper.toDomain(subscriptionObject);
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
    const where: QueryFilter<SubscriptionSchemaClass> = {};
    if (filterOptions?.status) {
      where.status = filterOptions.status;
    }
    if (filterOptions?.userId) {
      where.userId = filterOptions.userId;
    }

    const [subscriptionObjects, total] = await Promise.all([
      this.subscriptionsModel
        .find(where)
        .sort(
          sortOptions?.reduce(
            (accumulator, sort) => ({
              ...accumulator,
              [sort.orderBy === 'id' ? '_id' : sort.orderBy]:
                sort.order.toUpperCase() === 'ASC' ? 1 : -1,
            }),
            {},
          ),
        )
        .skip((paginationOptions.page - 1) * paginationOptions.limit)
        .limit(paginationOptions.limit),
      this.subscriptionsModel.countDocuments(where),
    ]);

    return {
      data: subscriptionObjects.map((subscriptionObject) =>
        SubscriptionMapper.toDomain(subscriptionObject),
      ),
      total,
    };
  }

  async findById(id: Subscription['id']): Promise<NullableType<Subscription>> {
    const subscriptionObject = await this.subscriptionsModel.findById(id);
    return subscriptionObject
      ? SubscriptionMapper.toDomain(subscriptionObject)
      : null;
  }

  async findByIds(ids: Subscription['id'][]): Promise<Subscription[]> {
    const subscriptionObjects = await this.subscriptionsModel.find({
      _id: { $in: ids.map((id) => id.toString()) },
    });
    return subscriptionObjects.map((subscriptionObject) =>
      SubscriptionMapper.toDomain(subscriptionObject),
    );
  }

  async findActiveByUserId(
    userId: string,
  ): Promise<NullableType<Subscription>> {
    const subscriptionObject = await this.subscriptionsModel.findOne({
      userId,
      status: 'active',
    });
    return subscriptionObject
      ? SubscriptionMapper.toDomain(subscriptionObject)
      : null;
  }

  async findByUserId(
    userId: string,
  ): Promise<{ data: Subscription[]; total: number }> {
    const [subscriptionObjects, total] = await Promise.all([
      this.subscriptionsModel
        .find({
          userId,
        })
        .sort({ subscribedAt: -1 }),
      this.subscriptionsModel.countDocuments({ userId }),
    ]);

    return {
      data: subscriptionObjects.map((subscriptionObject) =>
        SubscriptionMapper.toDomain(subscriptionObject),
      ),
      total,
    };
  }

  async update(
    id: Subscription['id'],
    payload: Partial<Subscription>,
  ): Promise<Subscription | null> {
    const clonedPayload = { ...payload };
    delete clonedPayload.id;

    const filter = { _id: id.toString() };
    const subscription = await this.subscriptionsModel.findOne(filter);

    if (!subscription) {
      return null;
    }

    const subscriptionObject = await this.subscriptionsModel.findOneAndUpdate(
      filter,
      SubscriptionMapper.toPersistence({
        ...SubscriptionMapper.toDomain(subscription),
        ...clonedPayload,
      }),
      { new: true },
    );

    return subscriptionObject
      ? SubscriptionMapper.toDomain(subscriptionObject)
      : null;
  }

  async remove(id: Subscription['id']): Promise<void> {
    await this.subscriptionsModel.deleteOne({
      _id: id.toString(),
    });
  }
}
