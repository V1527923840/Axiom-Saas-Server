import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Daily Summary Brief (D10 V3 + V3.1) — SaaS read-only consumption.
 *
 * daily: 4-section `sections` array (macro_overseas | industry | stock | risk).
 * weekly: `sections` is an object {weekly_events: [...]} (10-15 events).
 *
 * The migration is intentionally idempotent (`IF NOT EXISTS` everywhere,
 * plus an `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for `has_data_warning`)
 * so it can be safely re-run on environments where the table was already
 * created out-of-band (the local dev DB at `192.168.1.3` is in this state
 * as of 2026-08-11).
 */
export class CreateDailySummaryTable1791000000000 implements MigrationInterface {
  name = 'CreateDailySummaryTable1791000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS daily_summary (
        report_id uuid NOT NULL DEFAULT gen_random_uuid(),
        frequency varchar(16) NOT NULL,
        report_date date NOT NULL,
        week_start date,
        is_final boolean NOT NULL DEFAULT false,
        is_latest boolean NOT NULL DEFAULT true,
        revision integer NOT NULL DEFAULT 1,
        data_window_start timestamp with time zone NOT NULL,
        data_window_end timestamp with time zone NOT NULL,
        sections jsonb NOT NULL,
        source_post_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
        source_research_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
        source_post_count integer NOT NULL DEFAULT 0,
        source_research_count integer NOT NULL DEFAULT 0,
        completeness_ratio numeric(5,3) NOT NULL DEFAULT 1.0,
        trigger_reason varchar(64) NOT NULL,
        build_prompt_version varchar(64) NOT NULL,
        build_model varchar(64) NOT NULL,
        source_post_range tstzrange,
        has_topics boolean NOT NULL DEFAULT false,
        topics jsonb NOT NULL DEFAULT '[]'::jsonb,
        brief_summary_md text,
        generated_at timestamp with time zone NOT NULL DEFAULT now(),
        last_data_check_at timestamp with time zone NOT NULL DEFAULT now(),
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        updated_at timestamp with time zone NOT NULL DEFAULT now(),
        has_data_warning boolean NOT NULL DEFAULT false,
        PRIMARY KEY (report_id),
        CONSTRAINT daily_summary_frequency_check CHECK ((frequency)::text = ANY ((ARRAY['daily'::character varying, 'weekly'::character varying])::text[])),
        CONSTRAINT chk_revision_positive CHECK (revision >= 1),
        CONSTRAINT chk_window_order CHECK (data_window_end > data_window_start),
        CONSTRAINT daily_summary_trigger_reason_check CHECK ((trigger_reason)::text = ANY ((ARRAY['scheduled'::character varying, 'manual_backfill'::character varying, 'scan_late_arrivals'::character varying, 'preview_generation'::character varying, 'final_overwrite'::character varying, 'after_processing'::character varying])::text[]))
      )
    `);

    // Bring pre-existing out-of-band tables up to the migration's expectation.
    // Safe to run on fresh DBs (no-op when the column already exists).
    await queryRunner.query(`
      ALTER TABLE daily_summary
        ADD COLUMN IF NOT EXISTS has_data_warning boolean NOT NULL DEFAULT false
    `);

    // v3.1 取消了 is_final / is_latest / revision 三字段 (1793000000000),
    // 但本迁移是更早的"建表"动作,IF NOT EXISTS 在已 drop 索引的库上会真
    // 去 CREATE,报 column "revision"/"is_latest" does not exist。
    // 用 information_schema 检测列是否还在 —— 还在 → fresh;不在 → 已
    // 1793 drop 过的环境,跳过。和 1790100000000 同款幂等思路。
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
          CREATE UNIQUE INDEX IF NOT EXISTS daily_summary_frequency_report_date_revision_key
            ON public.daily_summary USING btree (frequency, report_date, revision);
          CREATE INDEX IF NOT EXISTS idx_daily_summary_freq_date_rev
            ON public.daily_summary USING btree (frequency, report_date, revision DESC);
        END IF;
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'daily_summary'
            AND column_name = 'is_latest'
        ) THEN
          CREATE INDEX IF NOT EXISTS idx_daily_summary_freq_date_latest
            ON public.daily_summary USING btree (frequency, report_date DESC)
            WHERE (is_latest = true);
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_daily_summary_last_data_check
        ON public.daily_summary USING btree (last_data_check_at DESC)
    `);

    await queryRunner.query(`
      COMMENT ON TABLE daily_summary IS 'Daily Summary Brief (D10 V3 + V3.1) — SaaS 只读消费. daily 4 段 sections / weekly {weekly_events:[...]} .'
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN daily_summary.sections IS 'V3 daily 4 段 (macro_overseas|industry|stock|risk) sections 数组; V3.1 weekly {weekly_events:[...]} 对象 (10-15 条事件)'
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN daily_summary.has_data_warning IS 'R1 completeness < 0.7 时为 TRUE, 替代原 trigger_reason += ''data_incomplete_warning'' 拼接方案 (Task #20, 2026-08-11).'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Mirrors the IF NOT EXISTS in up() so a re-run after revert is safe.
    await queryRunner.query(`DROP TABLE IF EXISTS daily_summary`);
  }
}
