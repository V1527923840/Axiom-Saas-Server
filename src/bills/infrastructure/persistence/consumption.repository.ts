import { NullableType } from '../../../utils/types/nullable.type';
import { Consumption } from '../../domain/consumption';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import {
  FilterConsumptionDto,
  SortConsumptionDto,
} from '../../dto/query-consumption.dto';

export abstract class ConsumptionRepository {
  abstract create(
    data: Omit<Consumption, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Consumption>;

  abstract findManyWithPagination({
    filterOptions,
    sortOptions,
    paginationOptions,
  }: {
    filterOptions?: FilterConsumptionDto | null;
    sortOptions?: SortConsumptionDto[] | null;
    paginationOptions: IPaginationOptions;
  }): Promise<{ data: Consumption[]; total: number }>;

  abstract findById(id: Consumption['id']): Promise<NullableType<Consumption>>;
}
