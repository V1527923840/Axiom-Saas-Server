import { Injectable, NotFoundException } from '@nestjs/common';
import { ResearchService } from '../research/research.service';
import { ResearchAnalysis } from '../research/domain/research';
import { ZsxqPostService } from '../zsxq-posts/zsxq-post.service';
import { ZsxqPost } from '../zsxq-posts/domain/zsxq-post';
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
    private readonly zsxqPostService: ZsxqPostService,
    private readonly researchService: ResearchService,
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
    const filterOptions: DailySummaryFilterOptions | null =
      q.frequency || q.dateFrom || q.dateTo
        ? {
            ...(q.frequency ? { frequency: q.frequency } : {}),
            ...(q.dateFrom ? { dateFrom: q.dateFrom } : {}),
            ...(q.dateTo ? { dateTo: q.dateTo } : {}),
          }
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
    const postIds = row.sourcePostIds ?? [];
    const researchIds = row.sourceResearchIds ?? [];
    if (!postIds.length && !researchIds.length) {
      return { posts: [], research: [] };
    }

    // `source_post_ids` reference zsxq_posts.id (uuid) and
    // `source_research_ids` reference research_analysis.id (integer).
    // They CANNOT share a single IN-batch query against either table —
    // doing so used to push numeric strings into the uuid column and
    // blow up with `invalid input syntax for type uuid: "<num>"`.
    // Look them up separately, then map back by id.
    const [posts, researchRows] = await Promise.all([
      postIds.length ? this.zsxqPostService.findManyByIds(postIds) : [],
      researchIds.length ? this.lookupResearchByIds(researchIds) : [],
    ]);
    const postById = new Map<string, ZsxqPost>(
      posts.map((it) => [it.id, it] as [string, ZsxqPost]),
    );
    const researchById = new Map<string, ResearchAnalysis>(
      researchRows.map(
        (it) => [String(it.id), it] as [string, ResearchAnalysis],
      ),
    );

    const postToMeta = (id: string): ContentItemMetaDto => {
      const it = postById.get(id);
      return {
        id,
        title: it?.title ?? '(missing)',
        categoryCode: it?.categoryL1 ?? 'unknown',
        publishDate: (it?.postDate ?? new Date(0)).toISOString?.() ?? '',
        // zsxq_posts only has source_file_key (an OSS object key, not
        // a full URL); surface it through the existing DTO slot so the
        // UI can show / download if it wants.
        sourceFileUrl: it?.sourceFileKey ?? null,
      };
    };

    const researchToMeta = (id: string): ContentItemMetaDto => {
      const it = researchById.get(id);
      return {
        id,
        // documentName on research_analysis is the user-facing title.
        title: it?.documentName ?? '(missing)',
        // Research rows don't carry a top-level categoryCode in the
        // dto surface; fall back to categoryL1 so the UI badge still
        // has something to show.
        categoryCode: it?.categoryL1 ?? 'research',
        publishDate: (it?.createdAt ?? new Date(0)).toISOString?.() ?? '',
        // research_analysis.ossUrl (or sourceFileKey) is the upstream
        // PDF key. ContentItemMeta.sourceFileUrl is wired through to
        // the existing UI surface.
        sourceFileUrl: it?.ossUrl ?? it?.sourceFileKey ?? null,
      };
    };

    return {
      posts: postIds.map(postToMeta),
      research: researchIds.map(researchToMeta),
    };
  }

  // Guard against the case where a daily_summary row carries a
  // non-numeric entry inside source_research_ids (e.g. an agent bug
  // emitted a uuid instead of an int). Drop those before hitting the
  // int IN query; the missing-id fallback in researchToMeta covers
  // them on the response side.
  private async lookupResearchByIds(ids: string[]) {
    const numericIds: number[] = [];
    for (const id of ids) {
      const n = Number(id);
      if (Number.isFinite(n) && Number.isInteger(n) && n >= 0) {
        numericIds.push(n);
      }
    }
    if (!numericIds.length) return [];
    return this.researchService.findManyByIds(numericIds);
  }
}
