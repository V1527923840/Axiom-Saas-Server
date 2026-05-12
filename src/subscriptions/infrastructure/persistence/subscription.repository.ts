import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { Subscription } from '../../domain/subscription';

import {
  FilterSubscriptionDto,
  SortSubscriptionDto,
} from '../../dto/query-subscription.dto';

export abstract class SubscriptionRepository {
  abstract create(
    data: Omit<Subscription, 'id' | 'createdAt' | 'deletedAt' | 'updatedAt'>,
  ): Promise<Subscription>;

  abstract findManyWithPagination({
    filterOptions,
    sortOptions,
    paginationOptions,
  }: {
    filterOptions?: FilterSubscriptionDto | null;
    sortOptions?: SortSubscriptionDto[] | null;
    paginationOptions: IPaginationOptions;
  }): Promise<{ data: Subscription[]; total: number }>;

  abstract findById(
    id: Subscription['id'],
  ): Promise<NullableType<Subscription>>;
  abstract findByIds(ids: Subscription['id'][]): Promise<Subscription[]>;
  abstract findActiveByUserId(
    userId: string,
  ): Promise<NullableType<Subscription>>;
  abstract findByUserId(
    userId: string,
  ): Promise<{ data: Subscription[]; total: number }>;

  abstract update(
    id: Subscription['id'],
    payload: DeepPartial<Subscription>,
  ): Promise<Subscription | null>;

  abstract remove(id: Subscription['id']): Promise<void>;
}
