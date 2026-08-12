import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 补 daily_summary 的 (report_date DESC, revision DESC) 复合索引。
 *
 * 既有 4 个索引（见 1791000000000）全部以 `frequency` 打头：
 *   - daily_summary_frequency_report_date_revision_key (unique)
 *   - idx_daily_summary_freq_date_latest (partial, is_latest=true)
 *   - idx_daily_summary_freq_date_rev
 *   - idx_daily_summary_last_data_check
 * 因此 `GET /api/v1/daily-summary?dateFrom=&dateTo=`（不带 frequency）
 * 走不到任何索引 —— 见 daily-summary.repository.ts:62-74，该分支只在
 * where 里放 reportDate，ORDER BY reportDate DESC, revision DESC，
 * 规划器只能 Seq Scan + Sort。
 *
 * 本表由 Agent 管线写入、SaaS 只读，行数在千级，普通 CREATE INDEX 写锁
 * 仅持续毫秒级，故不使用 CONCURRENTLY（那需要把全局
 * migrationsTransactionMode 改成 'each'，代价大于收益 —— 见 plan
 * Part 4.1）。
 */
export class AddDailySummaryReportDateIndex1792000000000 implements MigrationInterface {
  name = 'AddDailySummaryReportDateIndex1792000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // v3.1 取消了 revision 字段 (1793000000000),已 drop revision 的环境
    // 重放本迁移时 CREATE INDEX IF NOT EXISTS 失效,真去 CREATE 会报
    // column "revision" does not exist。仅在 revision 列还在时建索引,
    // 与 1791000000000 同款幂等处理。
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'daily_summary'
            AND column_name = 'revision'
        ) THEN
          CREATE INDEX IF NOT EXISTS idx_daily_summary_report_date_rev
            ON daily_summary (report_date DESC, revision DESC);
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_daily_summary_report_date_rev
    `);
  }
}
