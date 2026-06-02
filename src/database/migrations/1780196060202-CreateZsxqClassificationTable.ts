import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateZsxqClassificationTable1780196060202 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS zsxq_posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        scrape_log_id UUID,
        source_file_key VARCHAR(500) NOT NULL,
        version VARCHAR(50) NOT NULL,
        post_date DATE NOT NULL,
        category_l1 VARCHAR(100) NOT NULL,
        category_l2 VARCHAR(100) NOT NULL,
        summary TEXT,
        title TEXT,
        original_text TEXT NOT NULL,
        author VARCHAR(200),
        group_name VARCHAR(200),
        like_count INTEGER DEFAULT 0,
        comment_count INTEGER DEFAULT 0,
        source_credibility SMALLINT,
        timeliness_score SMALLINT,
        data_density SMALLINT,
        differentiation_score SMALLINT,
        actionability SMALLINT,
        risk_disclosure SMALLINT,
        confidence_factor DECIMAL(3,2),
        total_score SMALLINT,
        value_rating VARCHAR(10),
        sw_industry_tag JSONB,
        stock_mapping JSONB,
        expectation_gap JSONB,
        summary_points JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_zsxq_category_l1 ON zsxq_posts(category_l1)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_zsxq_category_l2 ON zsxq_posts(category_l1, category_l2)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_zsxq_category_date ON zsxq_posts(category_l1, category_l2, post_date DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_zsxq_version ON zsxq_posts(version)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_zsxq_value_rating ON zsxq_posts(value_rating)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_zsxq_total_score ON zsxq_posts(total_score)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_zsxq_sw_industry ON zsxq_posts USING GIN (sw_industry_tag)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS zsxq_posts`);
  }
}
