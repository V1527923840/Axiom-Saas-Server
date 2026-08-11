import { Injectable, NotFoundException } from '@nestjs/common';
import { ContentService } from '../content/content.service';
import { DailySummary } from './domain/daily-summary';
import {
  DailySummaryRepository,
  DailySummaryFilterOptions,
  DailySummaryPaginationOptions,
} from './infrastructure/persistence/daily-summary.repository';
import {
  ContentItemMetaDto,
  SourcesResponseDto,
} from './dto/sources-response.dto';
import { ListQueryDto } from './dto/list-query.dto';

@Injectable()
export class DailySummaryService {
  constructor(
    private readonly repository: DailySummaryRepository,
    private readonly contentService: ContentService,
  ) {}

  async getLatest(frequency: 'daily' | 'weekly'): Promise<DailySummary | null> {
    return this.repository.findLatest(frequency);
  }

  async list(q: ListQueryDto): Promise<{
    data: DailySummary[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const filterOptions: DailySummaryFilterOptions | null = q.frequency
      ? { frequency: q.frequency }
      : null;
    const paginationOptions: DailySummaryPaginationOptions = {
      page: q.page ?? 0,
      pageSize: q.pageSize ?? 20,
    };
    const [data, total] = await this.repository.findManyWithPagination({
      filterOptions,
      paginationOptions,
    });
    return {
      data,
      total,
      page: paginationOptions.page,
      pageSize: paginationOptions.pageSize,
    };
  }

  async getOne(reportId: string): Promise<DailySummary> {
    const row = await this.repository.findById(reportId);
    if (!row) throw new NotFoundException(`Report ${reportId} not found`);
    return row;
  }

  async getSources(reportId: string): Promise<SourcesResponseDto> {
    const row = await this.getOne(reportId);
    const allIds = [
      ...(row.sourcePostIds ?? []),
      ...(row.sourceResearchIds ?? []),
    ];
    if (!allIds.length) return { posts: [], research: [] };

    const items = await this.contentService.findManyByIds(allIds);
    const byId = new Map(items.map((it: any) => [it.id, it]));

    const toMeta = (id: string): ContentItemMetaDto => {
      const it: any = byId.get(id);
      return {
        id,
        title: it?.title ?? '(missing)',
        categoryCode: it?.categoryId ?? it?.categoryCode ?? 'unknown',
        publishDate: (it?.publishDate ?? new Date(0)).toISOString?.() ?? '',
        sourceFileUrl: it?.sourceFileUrl ?? null,
      };
    };

    return {
      posts: (row.sourcePostIds ?? []).map(toMeta),
      research: (row.sourceResearchIds ?? []).map(toMeta),
    };
  }
}
