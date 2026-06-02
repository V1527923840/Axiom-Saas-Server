import { Intelligence } from '../../domain/intelligence';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { QueryIntelligenceDto } from '../../dto/query-intelligence.dto';

export abstract class IntelligenceRepository {
  abstract findManyWithPagination({
    filterOptions,
    paginationOptions,
  }: {
    filterOptions?: QueryIntelligenceDto;
    paginationOptions: IPaginationOptions;
  }): Promise<Intelligence[]>;

  abstract countWithFilters({
    filterOptions,
  }: {
    filterOptions?: QueryIntelligenceDto;
  }): Promise<number>;

  abstract findById(id: Intelligence['id']): Promise<Intelligence | null>;
}
