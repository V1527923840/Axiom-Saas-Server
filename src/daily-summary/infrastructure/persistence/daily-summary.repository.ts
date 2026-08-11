import { NullableType } from '../../../utils/types/nullable.type';
import { DailySummary } from '../../domain/daily-summary';

/**
 * 分页参数 —— **0-based**。
 *
 * 刻意不复用 `utils/types/pagination-options` 的 `IPaginationOptions`
 * ({ page, limit }, 1-based)：本模块的前端契约（plan Task 7/13）用的是
 * `page` 从 0 起、`pageSize` 命名，并把 `page` 原样回显给调用方。
 * 仓储实现按 `skip = page * pageSize` 换算。
 */
export interface DailySummaryPaginationOptions {
  /** 0 表示第一页 */
  page: number;
  pageSize: number;
}

export interface DailySummaryFilterOptions {
  /** 'daily' | 'weekly'；不传表示不过滤 */
  frequency?: string | null;
  /** ISO 日期 (YYYY-MM-DD)，对 report_date 做精确匹配；不传表示不过滤 */
  reportDate?: string | null;
}

/**
 * daily_summary 数据访问端口（六边形架构）。
 *
 * 只读：表由 Agent 侧管线写入，SaaS 端不提供 create/update/delete。
 */
export abstract class DailySummaryRepository {
  /**
   * 指定频率下最新的一份报告（`is_latest = true`），
   * 按 report_date DESC, revision DESC 取第一条。
   */
  abstract findLatest(
    frequency: DailySummary['frequency'],
  ): Promise<NullableType<DailySummary>>;

  abstract findById(
    reportId: DailySummary['reportId'],
  ): Promise<NullableType<DailySummary>>;

  /** 返回 `[当前页数据, 总条数]` */
  abstract findManyWithPagination(options: {
    filterOptions?: DailySummaryFilterOptions | null;
    paginationOptions: DailySummaryPaginationOptions;
  }): Promise<[DailySummary[], number]>;
}
