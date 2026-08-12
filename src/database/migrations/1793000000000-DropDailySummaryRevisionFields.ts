import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 取消 daily_summary 的版本化语义（is_final / is_latest / revision）。
 *
 * 业务侧已确认："每天只有一份日报 / 每周只有一份周报（时间窗口）"。
 * 因此把旧的三列复合唯一键 `(frequency, report_date, revision)` 拆成
 * 两条 partial unique index，让"一天一份日报 / 一周一份周报"由 DB 强约束：
 *
 *   - `frequency = 'daily'`  → UNIQUE (report_date)
 *   - `frequency = 'weekly'` → UNIQUE (week_start)
 *
 * 同时清理 3 个依赖旧字段的索引（lifecycle 不需要）：
 *   - `daily_summary_frequency_report_date_revision_key`  (unique)
 *   - `idx_daily_summary_freq_date_latest`                (partial, is_latest)
 *   - `idx_daily_summary_freq_date_rev`                   (含 revision)
 *   - 重建 `idx_daily_summary_report_date_rev`            (1792000000000 创建)
 *     为 `idx_daily_summary_report_date`，去掉 revision 列
 *
 * ⚠️ 运行前需确认生产库每个 (frequency, report_date) / (frequency='weekly',
 *    week_start) 组合下最多只有 1 行。若 Agent 仍写入多 revision，需先
 *    用保留策略（max(generated_at) 或 max(revision)）做一次 dedupe。
 *
 * 本表行数在千级，普通 ALTER/DROP INDEX/CREATE INDEX 写锁仅持续毫秒级，
 * 不使用 CONCURRENTLY（与 1792000000000 同款取舍 —— 避免把全局
 * migrationsTransactionMode 改成 'each'）。
 */
export class DropDailySummaryRevisionFields1793000000000 implements MigrationInterface {
  name = 'DropDailySummaryRevisionFields1793000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. 删依赖旧字段的 4 个索引 / 1 个 unique 约束 / 1 个 check 约束
    await queryRunner.query(`
      DROP INDEX IF EXISTS daily_summary_frequency_report_date_revision_key
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_daily_summary_freq_date_latest
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_daily_summary_freq_date_rev
    `);
    // 1792000000000 留下的 (report_date DESC, revision DESC) 索引 —— 同步
    // 重建为去掉 revision 列的形式。
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_daily_summary_report_date_rev
    `);
    await queryRunner.query(`
      ALTER TABLE daily_summary DROP CONSTRAINT IF EXISTS chk_revision_positive
    `);

    // 2. 拆出两条 partial unique index，分别约束 daily / weekly 的自然键
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS daily_summary_daily_date_key
        ON daily_summary (report_date)
        WHERE frequency = 'daily'
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS daily_summary_weekly_week_start_key
        ON daily_summary (week_start)
        WHERE frequency = 'weekly'
    `);

    // 3. 重建 report_date 复合索引（frequency + report_date DESC），服务
    //    "不带 frequency 的日期区间" 查询（GET /v1/daily-summary?dateFrom=&dateTo=）
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_daily_summary_report_date
        ON daily_summary (report_date DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_daily_summary_freq_report_date
        ON daily_summary (frequency, report_date DESC)
    `);

    // 4. 删列
    await queryRunner.query(`
      ALTER TABLE daily_summary DROP COLUMN IF EXISTS is_final
    `);
    await queryRunner.query(`
      ALTER TABLE daily_summary DROP COLUMN IF EXISTS is_latest
    `);
    await queryRunner.query(`
      ALTER TABLE daily_summary DROP COLUMN IF EXISTS revision
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. 加回列（默认值与原 schema 一致）
    await queryRunner.query(`
      ALTER TABLE daily_summary
        ADD COLUMN IF NOT EXISTS is_final boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      ALTER TABLE daily_summary
        ADD COLUMN IF NOT EXISTS is_latest boolean NOT NULL DEFAULT true
    `);
    await queryRunner.query(`
      ALTER TABLE daily_summary
        ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 1
    `);

    // 2. 删两条 partial unique
    await queryRunner.query(`
      DROP INDEX IF EXISTS daily_summary_daily_date_key
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS daily_summary_weekly_week_start_key
    `);

    // 3. 删新建的两个 report_date 索引
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_daily_summary_report_date
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_daily_summary_freq_report_date
    `);

    // 4. 重建原 4 个索引
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS daily_summary_frequency_report_date_revision_key
        ON daily_summary USING btree (frequency, report_date, revision)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_daily_summary_freq_date_latest
        ON daily_summary USING btree (frequency, report_date DESC)
        WHERE (is_latest = true)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_daily_summary_freq_date_rev
        ON daily_summary USING btree (frequency, report_date, revision DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_daily_summary_report_date_rev
        ON daily_summary (report_date DESC, revision DESC)
    `);
    await queryRunner.query(`
      ALTER TABLE daily_summary
        ADD CONSTRAINT IF NOT EXISTS chk_revision_positive CHECK (revision >= 1)
    `);
  }
}
