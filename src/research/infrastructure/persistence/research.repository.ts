import { ResearchAnalysis } from '../../domain/research';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { QueryResearchDto } from '../../dto/query-research.dto';

export abstract class ResearchRepository {
  abstract findManyWithPagination({
    filterOptions,
    paginationOptions,
  }: {
    filterOptions?: QueryResearchDto;
    paginationOptions: IPaginationOptions;
  }): Promise<ResearchAnalysis[]>;

  abstract countWithFilters({
    filterOptions,
  }: {
    filterOptions?: QueryResearchDto;
  }): Promise<number>;

  abstract findById(id: number): Promise<ResearchAnalysis | null>;
}
