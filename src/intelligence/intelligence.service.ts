import { Injectable, NotFoundException } from '@nestjs/common';
import { IntelligenceRepository } from './infrastructure/persistence/intelligence.repository';
import { Intelligence, IntelligenceListItem } from './domain/intelligence';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { QueryIntelligenceDto } from './dto/query-intelligence.dto';

@Injectable()
export class IntelligenceService {
  constructor(
    private readonly intelligenceRepository: IntelligenceRepository,
  ) {}

  async getIntelligenceList(query: QueryIntelligenceDto): Promise<{
    data: IntelligenceListItem[];
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
      this.intelligenceRepository.findManyWithPagination({
        filterOptions: query,
        paginationOptions,
      }),
      this.intelligenceRepository.countWithFilters({
        filterOptions: query,
      }),
    ]);

    // Map to list item type (only include needed fields)
    const listItems: IntelligenceListItem[] = items.map((item) => ({
      id: item.id,
      title: item.title,
      author: item.author,
      groupName: item.groupName,
      summary: item.summary,
      postDate: item.postDate,
      createdAt: item.createdAt,
      categoryL1: item.categoryL1,
      categoryL2: item.categoryL2,
      valueRating: item.valueRating,
      totalScore: item.totalScore,
      swIndustryTag: item.swIndustryTag,
      stockMapping: item.stockMapping,
    }));

    return {
      data: listItems,
      total,
      page,
      pageSize,
    };
  }

  async getIntelligenceDetail(id: string): Promise<{ data: Intelligence }> {
    const intelligence = await this.intelligenceRepository.findById(id);
    if (!intelligence) {
      throw new NotFoundException({
        status: 404,
        errors: {
          intelligence: 'Intelligence not found',
        },
      });
    }
    return { data: intelligence };
  }
}
