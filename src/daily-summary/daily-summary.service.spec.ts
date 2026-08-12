// src/daily-summary/daily-summary.service.spec.ts
//
// Coverage targets for DailySummaryService.getSources (Part 6 of the
// `daily-summary 模块整理 + 接口契约收敛 + 生产迁移` plan):
//   1. publishDate 字符串日期正确透传（pg date → string 回归，Part 2.1）
//   2. 去重（Part 2.3）
//   3. lookupResearchByIds 过滤 0/''/'abc'（Part 2.2）
//   4. limit/offset 切片 + total 不受截断影响（Part 3.1）
//   5. missingIds 收集 + warn 恰好一次（Part 5）
//   6. 空来源提前返回时新字段齐全
//
// We hand-mock the three collaborators (no Nest container beyond DI
// wiring) following the industry-chain.service.spec.ts pattern.
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { DailySummaryService } from './daily-summary.service';
import { DailySummaryRepository } from './infrastructure/persistence/daily-summary.repository';
import { ResearchService } from '../research/research.service';
import { ZsxqPostService } from '../zsxq-posts/zsxq-post.service';

describe('DailySummaryService', () => {
  let service: DailySummaryService;
  let repo: jest.Mocked<DailySummaryRepository>;
  let zsxqPostService: jest.Mocked<ZsxqPostService>;
  let researchService: jest.Mocked<ResearchService>;
  let warnSpy: jest.SpyInstance;

  const REPORT_ID = 'aecb9470-e7b8-4977-a3c4-819521a570eb';

  const baseRow = (
    overrides: Partial<{
      sourcePostIds: string[];
      sourceResearchIds: string[];
    }> = {},
  ) => ({
    reportId: REPORT_ID,
    frequency: 'daily' as const,
    reportDate: '2026-08-10',
    weekStart: null,
    dataWindowStart: new Date('2026-08-10T00:00:00Z'),
    dataWindowEnd: new Date('2026-08-10T23:59:59Z'),
    sections: {},
    sourcePostIds: [],
    sourceResearchIds: [],
    sourcePostCount: 0,
    sourceResearchCount: 0,
    completenessRatio: '1.0',
    triggerReason: 'scheduled',
    buildPromptVersion: 'v1',
    buildModel: 'gpt-x',
    sourcePostRange: null,
    hasTopics: false,
    topics: [],
    briefSummaryMd: null,
    generatedAt: new Date('2026-08-10T01:00:00Z'),
    lastDataCheckAt: new Date('2026-08-10T01:00:00Z'),
    createdAt: new Date('2026-08-10T01:00:00Z'),
    updatedAt: new Date('2026-08-10T01:00:00Z'),
    hasDataWarning: false,
    ...overrides,
  });

  beforeEach(async () => {
    const repoMock: Partial<jest.Mocked<DailySummaryRepository>> = {
      findById: jest.fn(),
    };
    const zsxqMock: Partial<jest.Mocked<ZsxqPostService>> = {
      findManyByIds: jest.fn(),
    };
    const researchMock: Partial<jest.Mocked<ResearchService>> = {
      findManyByIds: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        DailySummaryService,
        { provide: DailySummaryRepository, useValue: repoMock },
        { provide: ZsxqPostService, useValue: zsxqMock },
        { provide: ResearchService, useValue: researchMock },
      ],
    }).compile();

    service = moduleRef.get(DailySummaryService);
    repo = moduleRef.get(
      DailySummaryRepository,
    ) as jest.Mocked<DailySummaryRepository>;
    zsxqPostService = moduleRef.get(
      ZsxqPostService,
    ) as jest.Mocked<ZsxqPostService>;
    researchService = moduleRef.get(
      ResearchService,
    ) as jest.Mocked<ResearchService>;

    // Spy on Logger.warn so we can assert missing-id log calls without
    // dragging in a transport. Nest's default Logger writes to stderr.
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('should return empty arrays + zero totals when the row has no sources (Part 6 #6)', async () => {
    repo.findById.mockResolvedValue(baseRow());

    const result = await service.getSources(REPORT_ID);

    expect(result).toEqual({
      posts: [],
      research: [],
      postsTotal: 0,
      researchTotal: 0,
      missingIds: [],
    });
    expect(zsxqPostService.findManyByIds).not.toHaveBeenCalled();
    expect(researchService.findManyByIds).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('should pass pg date string through as publishDate (Part 2.1 regression)', async () => {
    repo.findById.mockResolvedValue(
      baseRow({ sourcePostIds: ['p1'], sourceResearchIds: [] }),
    );
    zsxqPostService.findManyByIds.mockResolvedValue([
      {
        id: 'p1',
        title: '帖子一',
        categoryL1: 'STOCK',
        postDate: '2026-08-09', // pg date column → raw string
        sourceFileKey: 'oss/x.pdf',
      },
    ]);

    const result = await service.getSources(REPORT_ID);

    expect(result.posts[0].publishDate).toBe('2026-08-09');
    expect(result.posts[0].publishDate).not.toBe('');
  });

  it('should dedupe source_post_ids / source_research_ids (Part 2.3)', async () => {
    repo.findById.mockResolvedValue(
      baseRow({
        sourcePostIds: ['p1', 'p2', 'p1', 'p2', 'p1'],
        sourceResearchIds: ['7', '7', '8'],
      }),
    );
    zsxqPostService.findManyByIds.mockResolvedValue([
      {
        id: 'p1',
        title: 'a',
        categoryL1: null,
        postDate: '2026-08-09',
        sourceFileKey: null,
      },
      {
        id: 'p2',
        title: 'b',
        categoryL1: null,
        postDate: '2026-08-10',
        sourceFileKey: null,
      },
    ]);
    researchService.findManyByIds.mockResolvedValue([
      {
        id: 7,
        version: '1',
        documentName: 'r1',
        sourceFileKey: null,
        ossUrl: null,
        categoryL1: null,
        createdAt: new Date('2026-08-08T00:00:00Z'),
        updatedAt: new Date('2026-08-08T00:00:00Z'),
      },
      {
        id: 8,
        version: '1',
        documentName: 'r2',
        sourceFileKey: null,
        ossUrl: null,
        categoryL1: null,
        createdAt: new Date('2026-08-09T00:00:00Z'),
        updatedAt: new Date('2026-08-09T00:00:00Z'),
      },
    ]);

    const result = await service.getSources(REPORT_ID);

    // Source repo called with deduplicated ids
    expect(zsxqPostService.findManyByIds).toHaveBeenCalledWith(['p1', 'p2']);
    expect(researchService.findManyByIds).toHaveBeenCalledWith([7, 8]);
    expect(result.postsTotal).toBe(2);
    expect(result.researchTotal).toBe(2);
  });

  it('should drop 0/empty/non-numeric ids in lookupResearchByIds (Part 2.2)', async () => {
    repo.findById.mockResolvedValue(
      baseRow({ sourceResearchIds: ['0', '', ' ', 'abc', '42', '-3'] }),
    );
    researchService.findManyByIds.mockResolvedValue([]);

    await service.getSources(REPORT_ID);

    // '0' / '' / ' ' / 'abc' / '-3' all fail `n >= 1`. Only '42' remains.
    expect(researchService.findManyByIds).toHaveBeenCalledWith([42]);
  });

  it('should slice by limit/offset but report the un-sliced total (Part 3.1)', async () => {
    const postIds = ['p1', 'p2', 'p3', 'p4', 'p5'];
    repo.findById.mockResolvedValue(
      baseRow({ sourcePostIds: postIds, sourceResearchIds: [] }),
    );
    zsxqPostService.findManyByIds.mockResolvedValue(
      postIds.slice(2, 4).map((id) => ({
        id,
        title: id,
        categoryL1: null,
        postDate: '2026-08-09',
        sourceFileKey: null,
      })),
    );

    const result = await service.getSources(REPORT_ID, { limit: 2, offset: 2 });

    expect(zsxqPostService.findManyByIds).toHaveBeenCalledWith(['p3', 'p4']);
    expect(result.posts.map((p) => p.id)).toEqual(['p3', 'p4']);
    expect(result.postsTotal).toBe(5); // unaffected by limit
    expect(result.researchTotal).toBe(0);
  });

  it('should collect missingIds and warn exactly once when sources are missing (Part 5)', async () => {
    repo.findById.mockResolvedValue(
      baseRow({
        sourcePostIds: ['p1', 'p2-missing'],
        sourceResearchIds: ['42'],
      }),
    );
    zsxqPostService.findManyByIds.mockResolvedValue([
      // Only p1 exists in source table.
      {
        id: 'p1',
        title: 'a',
        categoryL1: null,
        postDate: '2026-08-09',
        sourceFileKey: null,
      },
    ]);
    researchService.findManyByIds.mockResolvedValue([
      // research id 42 does not exist.
      // empty array — caller treats as missing
    ]);

    const result = await service.getSources(REPORT_ID);

    expect(result.missingIds.sort()).toEqual(['42', 'p2-missing']);
    expect(result.posts.find((p) => p.id === 'p2-missing')?.title).toBe(
      '(missing)',
    );
    expect(result.research[0].title).toBe('(missing)');
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain(`reportId=${REPORT_ID}`);
    expect(warnSpy.mock.calls[0][0]).toContain('有 2 个来源 id');
  });

  it('should truncate the missing id list to 20 in the warn log', async () => {
    const missingPostIds = Array.from({ length: 30 }, (_, i) => `mp-${i}`);
    repo.findById.mockResolvedValue(
      baseRow({ sourcePostIds: missingPostIds, sourceResearchIds: [] }),
    );
    zsxqPostService.findManyByIds.mockResolvedValue([]);

    await service.getSources(REPORT_ID, { limit: 200 });

    expect(warnSpy).toHaveBeenCalledTimes(1);
    const msg = warnSpy.mock.calls[0][0];
    expect(msg).toContain('有 30 个来源 id');
    expect(msg).toContain('...(+10)'); // 30 - 20 = 10
  });
});
