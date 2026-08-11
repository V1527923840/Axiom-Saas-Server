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

  // IN-batch lookup for callers that hold a list of ids (e.g.
  // DailySummaryService.getSources mapping `source_research_ids` back to
  // rows). Note: research_analysis.id is integer, unlike
  // content_item.id which is uuid — they must NOT share a single
  // findManyByIds.
  abstract findManyByIds(ids: number[]): Promise<ResearchAnalysis[]>;
}
