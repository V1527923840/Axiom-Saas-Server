import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { AllConfigType } from '../config/config.type';
import { IntelligenceService } from '../intelligence/intelligence.service';
import { ResearchService } from '../research/research.service';
import { QueryIntelligenceDto } from '../intelligence/dto/query-intelligence.dto';
import { QueryResearchDto } from '../research/dto/query-research.dto';
import { McpRateLimiterService } from './mcp-rate-limiter.service';
import { McpAuditService } from './mcp-audit.service';
import { currentMcpCaller } from './mcp-request-context';

/**
 * Shared shape for the "list" tools. MCP clients want a flat, compact
 * result — the raw domain objects carry large JSONB pyramid payloads and
 * raw original text, which would blow up the model's context window.
 */
interface McpListResult {
  total: number;
  page: number;
  pageSize: number;
  items: Record<string, unknown>[];
}

/**
 * The arguments a tool call was made with, reduced to the filter values
 * that actually reach the database. Used for the audit log.
 */
type AuditArgs = Record<string, unknown>;

/**
 * Builds the MCP tool surface on top of the existing REST services.
 *
 * Design notes:
 * - The tools call `IntelligenceService` / `ResearchService` directly
 *   instead of issuing HTTP requests to our own API. This keeps the
 *   database access on the existing TypeORM repositories and avoids
 *   re-implementing filters that already exist in the query DTOs.
 * - Output is deliberately trimmed. The list tools return only the fields
 *   that help a model decide *which* item to open; the detail tools return
 *   the full pyramid structure plus (optionally) the original text.
 * - Every tool call passes through `runGuarded`, which applies the
 *   per-caller rate limit, the global concurrency cap, and the audit
 *   trail. See `mcp-rate-limiter.service.ts` for why those matter.
 */
@Injectable()
export class McpService {
  private readonly logger = new Logger(McpService.name);

  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    private readonly intelligenceService: IntelligenceService,
    private readonly researchService: ResearchService,
    private readonly rateLimiter: McpRateLimiterService,
    private readonly audit: McpAuditService,
  ) {}

  private maxPageSize(): number {
    return this.configService.get('mcp.maxPageSize', { infer: true }) ?? 20;
  }

  private maxOriginalTextLength(): number {
    return (
      this.configService.get('mcp.maxOriginalTextLength', { infer: true }) ??
      20000
    );
  }

  private maxFilterLength(): number {
    return (
      this.configService.get('mcp.maxFilterLength', { infer: true }) ?? 100
    );
  }

  /**
   * Reject over-long filter values.
   *
   * `keyword` / `company` are matched with `ILIKE '%value%'`. On a
   * `text` column that cannot use a b-tree index, so every call is a
   * sequential scan; a longer pattern does not change the cost much, but
   * capping the length bounds the work and rejects obvious probing
   * attempts early.
   */
  private assertFilterLength(value: string | undefined, field: string): void {
    if (!value) return;
    const limit = this.maxFilterLength();
    if (value.length > limit) {
      throw new Error(
        `'${field}' is too long (max ${limit} characters). ` +
          `Use a shorter, more specific keyword.`,
      );
    }
  }

  /**
   * Truncate long text and make the cut explicit, so the model does not
   * mistake a truncated document for a complete one.
   */
  private truncate(text: string | null | undefined): string | undefined {
    if (!text) return text ?? undefined;
    const limit = this.maxOriginalTextLength();
    if (text.length <= limit) return text;
    return `${text.slice(0, limit)}\n\n[...truncated, ${text.length - limit} more characters. Call with includeOriginalText=false or narrow the query to see less.]`;
  }

  /** Flatten the pyramid JSONB columns into a readable structure. */
  private pyramidOf(source: Record<string, any>): Record<string, unknown> {
    return {
      rawFacts: source.rawFacts ?? null,
      inductionGroups: source.inductionGroups ?? null,
      baseView: source.baseView ?? null,
      midView: source.midView ?? null,
      coreView: source.coreView ?? null,
      pyramidJudgement: source.pyramidJudgement ?? null,
      pyramidVersion: source.pyramidVersion ?? null,
    };
  }

  /**
   * Run a tool body under the per-caller rate limit, the global
   * concurrency cap and the audit trail.
   *
   * Order matters:
   * 1. Rate limit — rejected before any DB work happens.
   * 2. Concurrency slot — held for the duration of the call only.
   * 3. Audit — recorded in `finally` so both success and failure are
   *    captured, with the measured duration.
   *
   * A throttled call is reported to the model as a readable `isError`
   * result rather than a protocol-level failure, so the client can back
   * off and retry instead of the whole session breaking.
   */
  private async runGuarded<T>(
    toolName: string,
    args: AuditArgs,
    body: () => Promise<T>,
  ): Promise<{
    content: { type: 'text'; text: string }[];
    isError?: boolean;
  }> {
    const caller = currentMcpCaller();
    const callerId = caller?.id ?? 'unknown';
    const callerKind = caller?.kind ?? 'api-key';

    // 1. Per-caller rate limit.
    try {
      this.rateLimiter.consume(callerId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.audit.record({
        callerId,
        callerKind,
        tool: toolName,
        status: 'rate_limited',
        durationMs: 0,
        args,
        error: message,
      });
      return {
        content: [
          {
            type: 'text',
            text:
              `Tool "${toolName}" was throttled: ${message} ` +
              `Wait a moment and retry — do not retry immediately in a loop.`,
          },
        ],
        isError: true,
      };
    }

    // 2. Global concurrency slot.
    let release: (() => void) | undefined;
    try {
      release = this.rateLimiter.acquireSlot();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.audit.record({
        callerId,
        callerKind,
        tool: toolName,
        status: 'rate_limited',
        durationMs: 0,
        args,
        error: message,
      });
      return {
        content: [
          {
            type: 'text',
            text:
              `Tool "${toolName}" was throttled: ${message} ` +
              `The server is busy — retry shortly.`,
          },
        ],
        isError: true,
      };
    }

    // 3. Execute under audit.
    const startedAt = Date.now();
    try {
      const result = await body();
      this.audit.record({
        callerId,
        callerKind,
        tool: toolName,
        status: 'ok',
        durationMs: Date.now() - startedAt,
        args,
      });
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.audit.record({
        callerId,
        callerKind,
        tool: toolName,
        status: 'error',
        durationMs: Date.now() - startedAt,
        args,
        error: message,
      });
      return {
        content: [
          { type: 'text', text: `Tool "${toolName}" failed: ${message}` },
        ],
        isError: true,
      };
    } finally {
      release();
    }
  }

  /**
   * Register every tool on the given McpServer instance.
   *
   * Called once per MCP session (or once per request in stateless mode).
   */
  public registerTools(server: McpServer): void {
    // ------------------------------------------------------------------
    // Intelligence (情报精选)
    // ------------------------------------------------------------------

    server.registerTool(
      'search_intelligence',
      {
        title: '搜索情报精选',
        description:
          '按关键词、公司、分类和日期范围搜索「情报精选」文章，返回文章列表（标题、作者、摘要、分类、涉及个股、金字塔核心观点摘要）。' +
          '返回结果仅含概要，需要正文原文或完整金字塔观点时请调用 get_intelligence_detail。',
        inputSchema: {
          keyword: z
            .string()
            .optional()
            .describe('标题关键词模糊匹配，例如 "AI"、"算力"'),
          company: z
            .string()
            .optional()
            .describe('涉及的个股/公司名称，例如 "海光信息"'),
          categoryL1: z
            .string()
            .optional()
            .describe('一级分类，例如 "INDUSTRY"'),
          categoryL2: z
            .string()
            .optional()
            .describe('二级分类，例如 "INDUSTRY_NEWS"'),
          dateFrom: z.string().optional().describe('起始日期，格式 YYYY-MM-DD'),
          dateTo: z.string().optional().describe('结束日期，格式 YYYY-MM-DD'),
          page: z
            .number()
            .int()
            .min(1)
            .optional()
            .describe('页码，从 1 开始，默认 1'),
          pageSize: z
            .number()
            .int()
            .min(1)
            .optional()
            .describe(`每页条数，默认 10，最大 ${this.maxPageSize()}`),
        },
      },
      async (args): Promise<{ content: { type: 'text'; text: string }[] }> => {
        return this.runGuarded(
          'search_intelligence',
          {
            keyword: args.keyword,
            company: args.company,
            categoryL1: args.categoryL1,
            categoryL2: args.categoryL2,
            dateFrom: args.dateFrom,
            dateTo: args.dateTo,
            page: args.page,
            pageSize: args.pageSize,
          },
          async () => {
            this.assertFilterLength(args.keyword, 'keyword');
            this.assertFilterLength(args.company, 'company');

            const query: QueryIntelligenceDto = {
              ...args,
              page: args.page ?? 1,
              pageSize: Math.min(args.pageSize ?? 10, this.maxPageSize()),
            };

            const result =
              await this.intelligenceService.getIntelligenceList(query);

            const payload: McpListResult = {
              total: result.total,
              page: result.page,
              pageSize: result.pageSize,
              items: result.data.map((item) => ({
                id: item.id,
                title: item.title,
                author: item.author,
                groupName: item.groupName,
                summary: item.summary,
                postDate: item.postDate,
                categoryL1: item.categoryL1,
                categoryL2: item.categoryL2,
                swIndustryTag: item.swIndustryTag,
                mentionedStocks: item.stockMapping?.mentionedStocks ?? null,
                coreView: item.coreView,
                pyramidVersion: item.pyramidVersion,
                classificationMethod: item.classificationMethod,
              })),
            };

            return payload;
          },
        );
      },
    );

    server.registerTool(
      'get_intelligence_detail',
      {
        title: '查看情报精选详情',
        description:
          '根据情报 id 获取单篇文章的完整内容，包含金字塔观点结构（原始事实、归纳分组、基础层观点、中层观点、核心观点、金字塔判断）以及可选的原文文本。',
        inputSchema: {
          id: z
            .string()
            .describe('情报 id（UUID），来自 search_intelligence 的结果'),
          includeOriginalText: z
            .boolean()
            .optional()
            .describe(
              '是否返回原文文本，默认 true。原文可能很长，不确定时传 false',
            ),
        },
      },
      async (args): Promise<{ content: { type: 'text'; text: string }[] }> => {
        return this.runGuarded(
          'get_intelligence_detail',
          { id: args.id, includeOriginalText: args.includeOriginalText },
          async () => {
            const detail = await this.intelligenceService.getIntelligenceDetail(
              args.id,
            );
            const item = detail.data;

            const includeOriginal = args.includeOriginalText !== false;

            return {
              id: item.id,
              title: item.title,
              author: item.author,
              groupName: item.groupName,
              postDate: item.postDate,
              categoryL1: item.categoryL1,
              categoryL2: item.categoryL2,
              summary: item.summary,
              swIndustryTag: item.swIndustryTag,
              stockMapping: item.stockMapping,
              expectationGap: item.expectationGap,
              pyramid: this.pyramidOf(item),
              originalText: includeOriginal
                ? this.truncate(item.originalText)
                : undefined,
              originalTextRaw: includeOriginal
                ? this.truncate(item.originalTextRaw)
                : undefined,
              imageUrls: item.imageUrls,
              createdAt: item.createdAt,
            };
          },
        );
      },
    );

    // ------------------------------------------------------------------
    // Research analysis (机构研报)
    // ------------------------------------------------------------------

    server.registerTool(
      'search_research_analysis',
      {
        title: '搜索机构研报',
        description:
          '按关键词、分类和日期范围搜索「机构研报」分析记录，返回研报列表（文档名、核心论点、分类、涉及个股、金字塔核心观点摘要）。' +
          '返回结果仅含概要，需要完整金字塔观点请调用 get_research_analysis_detail。',
        inputSchema: {
          keyword: z
            .string()
            .optional()
            .describe('文档名称关键词模糊匹配，例如 "半导体"'),
          categoryL1: z.string().optional().describe('一级分类'),
          categoryL2: z.string().optional().describe('二级分类'),
          dateFrom: z.string().optional().describe('起始日期，格式 YYYY-MM-DD'),
          dateTo: z.string().optional().describe('结束日期，格式 YYYY-MM-DD'),
          page: z
            .number()
            .int()
            .min(1)
            .optional()
            .describe('页码，从 1 开始，默认 1'),
          pageSize: z
            .number()
            .int()
            .min(1)
            .optional()
            .describe(`每页条数，默认 10，最大 ${this.maxPageSize()}`),
        },
      },
      async (args): Promise<{ content: { type: 'text'; text: string }[] }> => {
        return this.runGuarded(
          'search_research_analysis',
          {
            keyword: args.keyword,
            categoryL1: args.categoryL1,
            categoryL2: args.categoryL2,
            dateFrom: args.dateFrom,
            dateTo: args.dateTo,
            page: args.page,
            pageSize: args.pageSize,
          },
          async () => {
            this.assertFilterLength(args.keyword, 'keyword');

            const query: QueryResearchDto = {
              ...args,
              page: args.page ?? 1,
              pageSize: Math.min(args.pageSize ?? 10, this.maxPageSize()),
            };

            const result = await this.researchService.getResearchList(query);

            const payload: McpListResult = {
              total: result.total,
              page: result.page,
              pageSize: result.pageSize,
              items: result.data.map((item) => ({
                id: item.id,
                documentName: item.documentName,
                keyThesis: item.keyThesis,
                createdAt: item.createdAt,
                categoryL1: item.categoryL1,
                categoryL2: item.categoryL2,
                swIndustryTag: item.swIndustryTag,
                mentionedStocks: item.mentionedStocks,
                coreView: item.coreView,
                pyramidVersion: item.pyramidVersion,
              })),
            };

            return payload;
          },
        );
      },
    );

    server.registerTool(
      'get_research_analysis_detail',
      {
        title: '查看机构研报详情',
        description:
          '根据研报 id 获取单份研报的完整分析结果，包含金字塔观点结构（原始事实、归纳分组、基础层观点、中层观点、核心观点、金字塔判断）以及原文文件地址。',
        inputSchema: {
          id: z
            .number()
            .int()
            .describe('研报 id（数字），来自 search_research_analysis 的结果'),
        },
      },
      async (args): Promise<{ content: { type: 'text'; text: string }[] }> => {
        return this.runGuarded(
          'get_research_analysis_detail',
          { id: args.id },
          async () => {
            const detail = await this.researchService.getResearchDetail(
              args.id,
            );
            const item = detail.data;

            return {
              id: item.id,
              documentName: item.documentName,
              docType: item.docType,
              keyThesis: item.keyThesis,
              createdAt: item.createdAt,
              categoryL1: item.categoryL1,
              categoryL2: item.categoryL2,
              swIndustryTag: item.swIndustryTag,
              mentionedStocks: item.mentionedStocks,
              ossUrl: item.ossUrl,
              sourceFileKey: item.sourceFileKey,
              pyramid: this.pyramidOf(item),
            };
          },
        );
      },
    );
  }
}
