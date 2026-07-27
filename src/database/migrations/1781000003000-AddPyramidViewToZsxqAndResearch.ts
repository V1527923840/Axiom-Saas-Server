import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Pyramid-view schema sync.
 *
 * Replaces the legacy 6-dimension scoring system (source_credibility,
 * timeliness_score, data_density, differentiation_score, actionability,
 * risk_disclosure + total_score + value_rating) with a "pyramid view"
 * structure (raw_facts -> induction_groups -> base_view -> mid_view ->
 * core_view -> pyramid_judgement) shared across both zsxq_posts and
 * research_analysis.
 *
 * Also tightens types in research_analysis:
 *   - version: NULL -> NOT NULL
 *   - oss_url, local_path: varchar(500) -> text
 *
 * Idempotent: every DROP/ADD uses IF EXISTS / IF NOT EXISTS so the script
 * can be applied repeatedly without error.
 */
export class AddPyramidViewToZsxqAndResearch1781000003000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================================
    // Table: zsxq_posts
    // ============================================================
    // Drop legacy scoring + social-count columns
    await queryRunner.query(
      `ALTER TABLE zsxq_posts DROP COLUMN IF EXISTS like_count`,
    );
    await queryRunner.query(
      `ALTER TABLE zsxq_posts DROP COLUMN IF EXISTS comment_count`,
    );
    await queryRunner.query(
      `ALTER TABLE zsxq_posts DROP COLUMN IF EXISTS source_credibility`,
    );
    await queryRunner.query(
      `ALTER TABLE zsxq_posts DROP COLUMN IF EXISTS timeliness_score`,
    );
    await queryRunner.query(
      `ALTER TABLE zsxq_posts DROP COLUMN IF EXISTS data_density`,
    );
    await queryRunner.query(
      `ALTER TABLE zsxq_posts DROP COLUMN IF EXISTS differentiation_score`,
    );
    await queryRunner.query(
      `ALTER TABLE zsxq_posts DROP COLUMN IF EXISTS actionability`,
    );
    await queryRunner.query(
      `ALTER TABLE zsxq_posts DROP COLUMN IF EXISTS risk_disclosure`,
    );
    await queryRunner.query(
      `ALTER TABLE zsxq_posts DROP COLUMN IF EXISTS confidence_factor`,
    );
    await queryRunner.query(
      `ALTER TABLE zsxq_posts DROP COLUMN IF EXISTS total_score`,
    );
    await queryRunner.query(
      `ALTER TABLE zsxq_posts DROP COLUMN IF EXISTS value_rating`,
    );
    await queryRunner.query(
      `ALTER TABLE zsxq_posts DROP COLUMN IF EXISTS summary_points`,
    );

    // Drop indexes tied to the removed columns
    await queryRunner.query(`DROP INDEX IF EXISTS idx_zsxq_value_rating`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_zsxq_total_score`);

    // Add pyramid-view columns
    await queryRunner.query(
      `ALTER TABLE zsxq_posts ADD COLUMN IF NOT EXISTS classification_method VARCHAR(20) DEFAULT 'llm'`,
    );
    await queryRunner.query(
      `ALTER TABLE zsxq_posts ADD COLUMN IF NOT EXISTS raw_facts JSONB`,
    );
    await queryRunner.query(
      `ALTER TABLE zsxq_posts ADD COLUMN IF NOT EXISTS induction_groups JSONB`,
    );
    await queryRunner.query(
      `ALTER TABLE zsxq_posts ADD COLUMN IF NOT EXISTS base_view JSONB`,
    );
    await queryRunner.query(
      `ALTER TABLE zsxq_posts ADD COLUMN IF NOT EXISTS mid_view JSONB`,
    );
    await queryRunner.query(
      `ALTER TABLE zsxq_posts ADD COLUMN IF NOT EXISTS core_view JSONB`,
    );
    await queryRunner.query(
      `ALTER TABLE zsxq_posts ADD COLUMN IF NOT EXISTS pyramid_judgement JSONB`,
    );
    await queryRunner.query(
      `ALTER TABLE zsxq_posts ADD COLUMN IF NOT EXISTS pyramid_version VARCHAR(10) DEFAULT 'v2.0'`,
    );

    // Partial expression index on core_view.deduction_formula
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_zsxq_pyramid_core_formula ON zsxq_posts ((core_view->>'deduction_formula')) WHERE core_view IS NOT NULL`,
    );

    // ============================================================
    // Table: research_analysis
    // ============================================================
    // Drop legacy scoring + investment + content columns
    await queryRunner.query(
      `ALTER TABLE research_analysis DROP COLUMN IF EXISTS summary_points`,
    );
    await queryRunner.query(
      `ALTER TABLE research_analysis DROP COLUMN IF EXISTS source_credibility`,
    );
    await queryRunner.query(
      `ALTER TABLE research_analysis DROP COLUMN IF EXISTS timeliness_score`,
    );
    await queryRunner.query(
      `ALTER TABLE research_analysis DROP COLUMN IF EXISTS data_density`,
    );
    await queryRunner.query(
      `ALTER TABLE research_analysis DROP COLUMN IF EXISTS differentiation_score`,
    );
    await queryRunner.query(
      `ALTER TABLE research_analysis DROP COLUMN IF EXISTS actionability`,
    );
    await queryRunner.query(
      `ALTER TABLE research_analysis DROP COLUMN IF EXISTS risk_disclosure`,
    );
    await queryRunner.query(
      `ALTER TABLE research_analysis DROP COLUMN IF EXISTS confidence_factor`,
    );
    await queryRunner.query(
      `ALTER TABLE research_analysis DROP COLUMN IF EXISTS overall_score`,
    );
    await queryRunner.query(
      `ALTER TABLE research_analysis DROP COLUMN IF EXISTS value_rating`,
    );
    await queryRunner.query(
      `ALTER TABLE research_analysis DROP COLUMN IF EXISTS recommendation`,
    );
    await queryRunner.query(
      `ALTER TABLE research_analysis DROP COLUMN IF EXISTS target_price`,
    );
    await queryRunner.query(
      `ALTER TABLE research_analysis DROP COLUMN IF EXISTS investment_horizon`,
    );
    await queryRunner.query(
      `ALTER TABLE research_analysis DROP COLUMN IF EXISTS risks_warnings`,
    );
    await queryRunner.query(
      `ALTER TABLE research_analysis DROP COLUMN IF EXISTS impact_level`,
    );
    await queryRunner.query(
      `ALTER TABLE research_analysis DROP COLUMN IF EXISTS affected_sectors`,
    );
    await queryRunner.query(
      `ALTER TABLE research_analysis DROP COLUMN IF EXISTS market_sentiment`,
    );
    await queryRunner.query(
      `ALTER TABLE research_analysis DROP COLUMN IF EXISTS original_text`,
    );
    await queryRunner.query(
      `ALTER TABLE research_analysis DROP COLUMN IF EXISTS original_text_raw`,
    );

    // Drop indexes tied to the removed columns
    await queryRunner.query(`DROP INDEX IF EXISTS idx_research_value_rating`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_research_overall_score`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_research_impact_level`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_research_market_sentiment`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS idx_research_recommendation`);

    // Tighten types
    await queryRunner.query(
      `ALTER TABLE research_analysis ALTER COLUMN version SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE research_analysis ALTER COLUMN oss_url TYPE TEXT USING oss_url::TEXT`,
    );
    await queryRunner.query(
      `ALTER TABLE research_analysis ALTER COLUMN local_path TYPE TEXT USING local_path::TEXT`,
    );

    // Add pyramid-view columns
    await queryRunner.query(
      `ALTER TABLE research_analysis ADD COLUMN IF NOT EXISTS raw_facts JSONB`,
    );
    await queryRunner.query(
      `ALTER TABLE research_analysis ADD COLUMN IF NOT EXISTS induction_groups JSONB`,
    );
    await queryRunner.query(
      `ALTER TABLE research_analysis ADD COLUMN IF NOT EXISTS base_view JSONB`,
    );
    await queryRunner.query(
      `ALTER TABLE research_analysis ADD COLUMN IF NOT EXISTS mid_view JSONB`,
    );
    await queryRunner.query(
      `ALTER TABLE research_analysis ADD COLUMN IF NOT EXISTS core_view JSONB`,
    );
    await queryRunner.query(
      `ALTER TABLE research_analysis ADD COLUMN IF NOT EXISTS pyramid_judgement JSONB`,
    );
    await queryRunner.query(
      `ALTER TABLE research_analysis ADD COLUMN IF NOT EXISTS pyramid_version VARCHAR(10) DEFAULT 'v2.0'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ============================================================
    // Table: zsxq_posts (reverse)
    // ============================================================
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_zsxq_pyramid_core_formula`,
    );

    await queryRunner.query(
      `ALTER TABLE zsxq_posts DROP COLUMN IF EXISTS pyramid_version`,
    );
    await queryRunner.query(
      `ALTER TABLE zsxq_posts DROP COLUMN IF EXISTS pyramid_judgement`,
    );
    await queryRunner.query(
      `ALTER TABLE zsxq_posts DROP COLUMN IF EXISTS core_view`,
    );
    await queryRunner.query(
      `ALTER TABLE zsxq_posts DROP COLUMN IF EXISTS mid_view`,
    );
    await queryRunner.query(
      `ALTER TABLE zsxq_posts DROP COLUMN IF EXISTS base_view`,
    );
    await queryRunner.query(
      `ALTER TABLE zsxq_posts DROP COLUMN IF EXISTS induction_groups`,
    );
    await queryRunner.query(
      `ALTER TABLE zsxq_posts DROP COLUMN IF EXISTS raw_facts`,
    );
    await queryRunner.query(
      `ALTER TABLE zsxq_posts DROP COLUMN IF EXISTS classification_method`,
    );

    // Re-add legacy columns with their original types/defaults
    await queryRunner.query(
      `ALTER TABLE zsxq_posts ADD COLUMN IF NOT EXISTS summary_points JSONB`,
    );
    await queryRunner.query(
      `ALTER TABLE zsxq_posts ADD COLUMN IF NOT EXISTS value_rating VARCHAR(10)`,
    );
    await queryRunner.query(
      `ALTER TABLE zsxq_posts ADD COLUMN IF NOT EXISTS total_score SMALLINT`,
    );
    await queryRunner.query(
      `ALTER TABLE zsxq_posts ADD COLUMN IF NOT EXISTS confidence_factor DECIMAL(3,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE zsxq_posts ADD COLUMN IF NOT EXISTS risk_disclosure SMALLINT`,
    );
    await queryRunner.query(
      `ALTER TABLE zsxq_posts ADD COLUMN IF NOT EXISTS actionability SMALLINT`,
    );
    await queryRunner.query(
      `ALTER TABLE zsxq_posts ADD COLUMN IF NOT EXISTS differentiation_score SMALLINT`,
    );
    await queryRunner.query(
      `ALTER TABLE zsxq_posts ADD COLUMN IF NOT EXISTS data_density SMALLINT`,
    );
    await queryRunner.query(
      `ALTER TABLE zsxq_posts ADD COLUMN IF NOT EXISTS timeliness_score SMALLINT`,
    );
    await queryRunner.query(
      `ALTER TABLE zsxq_posts ADD COLUMN IF NOT EXISTS source_credibility SMALLINT`,
    );
    await queryRunner.query(
      `ALTER TABLE zsxq_posts ADD COLUMN IF NOT EXISTS comment_count INTEGER DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE zsxq_posts ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_zsxq_value_rating ON zsxq_posts(value_rating)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_zsxq_total_score ON zsxq_posts(total_score)`,
    );

    // ============================================================
    // Table: research_analysis (reverse)
    // ============================================================
    await queryRunner.query(
      `ALTER TABLE research_analysis DROP COLUMN IF EXISTS pyramid_version`,
    );
    await queryRunner.query(
      `ALTER TABLE research_analysis DROP COLUMN IF EXISTS pyramid_judgement`,
    );
    await queryRunner.query(
      `ALTER TABLE research_analysis DROP COLUMN IF EXISTS core_view`,
    );
    await queryRunner.query(
      `ALTER TABLE research_analysis DROP COLUMN IF EXISTS mid_view`,
    );
    await queryRunner.query(
      `ALTER TABLE research_analysis DROP COLUMN IF EXISTS base_view`,
    );
    await queryRunner.query(
      `ALTER TABLE research_analysis DROP COLUMN IF EXISTS induction_groups`,
    );
    await queryRunner.query(
      `ALTER TABLE research_analysis DROP COLUMN IF EXISTS raw_facts`,
    );

    // Loosen types back
    await queryRunner.query(
      `ALTER TABLE research_analysis ALTER COLUMN version DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE research_analysis ALTER COLUMN oss_url TYPE VARCHAR(500) USING substr(oss_url, 1, 500)`,
    );
    await queryRunner.query(
      `ALTER TABLE research_analysis ALTER COLUMN local_path TYPE VARCHAR(500) USING substr(local_path, 1, 500)`,
    );

    // Re-add legacy columns
    await queryRunner.query(
      `ALTER TABLE research_analysis ADD COLUMN IF NOT EXISTS original_text_raw TEXT`,
    );
    await queryRunner.query(
      `ALTER TABLE research_analysis ADD COLUMN IF NOT EXISTS original_text TEXT`,
    );
    await queryRunner.query(
      `ALTER TABLE research_analysis ADD COLUMN IF NOT EXISTS market_sentiment VARCHAR(20)`,
    );
    await queryRunner.query(
      `ALTER TABLE research_analysis ADD COLUMN IF NOT EXISTS affected_sectors JSONB`,
    );
    await queryRunner.query(
      `ALTER TABLE research_analysis ADD COLUMN IF NOT EXISTS impact_level VARCHAR(20)`,
    );
    await queryRunner.query(
      `ALTER TABLE research_analysis ADD COLUMN IF NOT EXISTS risks_warnings JSONB`,
    );
    await queryRunner.query(
      `ALTER TABLE research_analysis ADD COLUMN IF NOT EXISTS investment_horizon VARCHAR(20)`,
    );
    await queryRunner.query(
      `ALTER TABLE research_analysis ADD COLUMN IF NOT EXISTS target_price VARCHAR(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE research_analysis ADD COLUMN IF NOT EXISTS recommendation VARCHAR(20)`,
    );
    await queryRunner.query(
      `ALTER TABLE research_analysis ADD COLUMN IF NOT EXISTS value_rating VARCHAR(20)`,
    );
    await queryRunner.query(
      `ALTER TABLE research_analysis ADD COLUMN IF NOT EXISTS overall_score INTEGER`,
    );
    await queryRunner.query(
      `ALTER TABLE research_analysis ADD COLUMN IF NOT EXISTS confidence_factor DECIMAL(5,3)`,
    );
    await queryRunner.query(
      `ALTER TABLE research_analysis ADD COLUMN IF NOT EXISTS risk_disclosure INTEGER`,
    );
    await queryRunner.query(
      `ALTER TABLE research_analysis ADD COLUMN IF NOT EXISTS actionability INTEGER`,
    );
    await queryRunner.query(
      `ALTER TABLE research_analysis ADD COLUMN IF NOT EXISTS differentiation_score INTEGER`,
    );
    await queryRunner.query(
      `ALTER TABLE research_analysis ADD COLUMN IF NOT EXISTS data_density INTEGER`,
    );
    await queryRunner.query(
      `ALTER TABLE research_analysis ADD COLUMN IF NOT EXISTS timeliness_score INTEGER`,
    );
    await queryRunner.query(
      `ALTER TABLE research_analysis ADD COLUMN IF NOT EXISTS source_credibility INTEGER`,
    );
    await queryRunner.query(
      `ALTER TABLE research_analysis ADD COLUMN IF NOT EXISTS summary_points JSONB`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_research_value_rating ON research_analysis(value_rating)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_research_overall_score ON research_analysis(overall_score)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_research_impact_level ON research_analysis(impact_level)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_research_market_sentiment ON research_analysis(market_sentiment)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_research_recommendation ON research_analysis(recommendation)`,
    );
  }
}
