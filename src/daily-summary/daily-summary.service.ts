import { Injectable, Logger, NotFoundException } from '@nestjs/common';
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
import { SourcesQueryDto } from './dto/sources-query.dto';
import { ListDailySummariesResponseDto } from './dto/list-daily-summaries-response.dto';
import { ListQueryDto } from './dto/list-query.dto';

@Injectable()
export class DailySummaryService {
  private readonly logger = new Logger(DailySummaryService.name);

  constructor(
    private readonly repository: DailySummaryRepository,
    private readonly zsxqPostService: ZsxqPostService,
    private readonly researchService: ResearchService,
  ) {}

  async getLatest(frequency: 'daily' | 'weekly'): Promise<DailySummary | null> {
    return this.repository.findLatest(frequency);
  }

  async list(q: ListQueryDto): Promise<ListDailySummariesResponseDto> {
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

  async getSources(
    reportId: string,
    q: SourcesQueryDto = {},
  ): Promise<SourcesResponseDto> {
    const row = await this.getOne(reportId);
    const limit = q.limit ?? 200;
    const offset = q.offset ?? 0;

    // source_*_ids are jsonb arrays written by the Agent pipeline with
    // no uniqueness constraint. Dedupe so the same row doesn't render
    // twice in the UI and so React's `key={r.id}` doesn't collide.
    const allPostIds = [...new Set(row.sourcePostIds ?? [])];
    const allResearchIds = [...new Set(row.sourceResearchIds ?? [])];

    if (!allPostIds.length && !allResearchIds.length) {
      return {
        posts: [],
        research: [],
        postsTotal: 0,
        researchTotal: 0,
        missingIds: [],
      };
    }

    // Slice BEFORE hitting the DB — avoids hydrating 368 rows when the
    // caller only asked for 20.
    const postIds = allPostIds.slice(offset, offset + limit);
    const researchIds = allResearchIds.slice(offset, offset + limit);

    // `source_post_ids` reference zsxq_posts.id (uuid) and
    // `source_research_ids` reference research_analysis.id (integer).
    // They CANNOT share a single IN-batch query against either table —
    // doing so used to push numeric strings into the uuid column and
    // blow up with `invalid input syntax for type uuid: "<num>"`.
    // Look them up separately, then map back by id.
    const [zsxqRows, researchEntities] = await Promise.all([
      postIds.length ? this.zsxqPostService.findManyByIds(postIds) : [],
      researchIds.length ? this.lookupResearchByIds(researchIds) : [],
    ]);
    const postById = new Map<string, ZsxqPost>(
      zsxqRows.map((it) => [it.id, it] as [string, ZsxqPost]),
    );
    const researchById = new Map<string, ResearchAnalysis>(
      researchEntities.map(
        (it) => [String(it.id), it] as [string, ResearchAnalysis],
      ),
    );

    // Track missing ids across both groups so the frontend can
    // distinguish a genuinely-missing row from a row whose real title
    // happens to be the literal string "(missing)".
    const missingIds: string[] = [];

    const postToMeta = (id: string): ContentItemMetaDto => {
      const it = postById.get(id);
      if (!it) missingIds.push(id);
      return {
        id,
        title: it?.title ?? '(missing)',
        categoryCode: it?.categoryL1 ?? 'unknown',
        // zsxq_posts.post_date is pg `date` — driver returns the raw
        // 'YYYY-MM-DD' string. Pass it through unchanged.
        publishDate: it?.postDate ?? '',
      };
    };

    const researchToMeta = (id: string): ContentItemMetaDto => {
      const it = researchById.get(id);
      if (!it) missingIds.push(id);
      return {
        id,
        // documentName on research_analysis is the user-facing title.
        title: it?.documentName ?? '(missing)',
        // Research rows don't carry a top-level categoryCode in the
        // dto surface; fall back to categoryL1 so the UI badge still
        // has something to show.
        categoryCode: it?.categoryL1 ?? 'research',
        // research_analysis.createdAt is timestamptz (@CreateDateColumn)
        // — a real Date.
        publishDate: it?.createdAt ? it.createdAt.toISOString() : '',
      };
    };

    const posts = postIds.map(postToMeta);
    const research = researchIds.map(researchToMeta);

    if (missingIds.length) {
      // One log line per request, not per missing id — a single report
      // can have dozens of dangling ids. Truncate the id list to the
      // first 20 and append a `+(N-20)` marker so the line stays
      // readable.
      this.logger.warn(
        `[getSources] reportId=${reportId} 有 ${missingIds.length} 个来源 id ` +
          `在源表中不存在（posts=${allPostIds.length}, research=${allResearchIds.length}）: ` +
          `${missingIds.slice(0, 20).join(',')}` +
          (missingIds.length > 20 ? ` ...(+${missingIds.length - 20})` : ''),
      );
    }

    return {
      posts,
      research,
      postsTotal: allPostIds.length,
      researchTotal: allResearchIds.length,
      missingIds,
    };
  }

  // Guard against the case where a daily_summary row carries a
  // non-numeric entry inside source_research_ids (e.g. an agent bug
  // emitted a uuid instead of an int, or a JSON null leaked through).
  // Drop those before hitting the int IN query; the missing-id fallback
  // in researchToMeta covers them on the response side and the warn log
  // in getSources() surfaces the data-integrity issue.
  private async lookupResearchByIds(ids: string[]) {
    const numericIds: number[] = [];
    for (const id of ids) {
      const n = Number(id);
      // research_analysis.id is a SERIAL starting at 1 — `>= 1`
      // also blocks Number('') and Number(' ') which both coerce to 0.
      if (Number.isFinite(n) && Number.isInteger(n) && n >= 1) {
        numericIds.push(n);
      }
    }
    if (!numericIds.length) return [];
    return this.researchService.findManyByIds(numericIds);
  }
}
