import { Injectable, NotFoundException } from '@nestjs/common';
import { ResearchRepository } from './infrastructure/persistence/research.repository';
import { ResearchAnalysis, ResearchAnalysisListItem } from './domain/research';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { QueryResearchDto } from './dto/query-research.dto';

@Injectable()
export class ResearchService {
  constructor(private readonly researchRepository: ResearchRepository) {}

  async getResearchList(query: QueryResearchDto): Promise<{
    data: ResearchAnalysisListItem[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const page = query.page ?? 1;
    let pageSize = query.pageSize ?? 10;

    // Limit max pageSize to 100
    if (pageSize > 100) {
      pageSize = 100;
    }

    const paginationOptions: IPaginationOptions = { page, limit: pageSize };

    const [items, total] = await Promise.all([
      this.researchRepository.findManyWithPagination({
        filterOptions: query,
        paginationOptions,
      }),
      this.researchRepository.countWithFilters({
        filterOptions: query,
      }),
    ]);

    // Map to list item type (only include needed fields)
    const listItems: ResearchAnalysisListItem[] = items.map((item) => ({
      id: item.id,
      documentName: item.documentName,
      keyThesis: item.keyThesis,
      analyzedAt: item.analyzedAt,
      createdAt: item.createdAt,
      categoryL1: item.categoryL1,
      categoryL2: item.categoryL2,
      valueRating: item.valueRating,
      overallScore: item.overallScore,
      swIndustryTag: item.swIndustryTag,
      mentionedStocks: item.mentionedStocks,
    }));

    return {
      data: listItems,
      total,
      page,
      pageSize,
    };
  }

  async getResearchDetail(id: number): Promise<{ data: ResearchAnalysis }> {
    const research = await this.researchRepository.findById(id);
    if (!research) {
      throw new NotFoundException({
        status: 404,
        errors: {
          research: 'Research analysis not found',
        },
      });
    }
    return { data: research };
  }
}
