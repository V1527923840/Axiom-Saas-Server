import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExtendContentForAgentIngestion1747200000000 implements MigrationInterface {
  name = 'ExtendContentForAgentIngestion1747200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. 扩展 content_category 表
    await queryRunner.query(`
      ALTER TABLE content_category
      ADD COLUMN IF NOT EXISTS layer VARCHAR(32),
      ADD COLUMN IF NOT EXISTS parent_code VARCHAR(64),
      ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'
    `);

    // 2. 扩展 content_item 表
    await queryRunner.query(`
      ALTER TABLE content_item
      ADD COLUMN IF NOT EXISTS source_file VARCHAR(512),
      ADD COLUMN IF NOT EXISTS parser VARCHAR(128),
      ADD COLUMN IF NOT EXISTS report_date DATE,
      ADD COLUMN IF NOT EXISTS entry_index INT,
      ADD COLUMN IF NOT EXISTS entry_id VARCHAR(128),
      ADD COLUMN IF NOT EXISTS content_timestamp TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS companies JSONB DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS sentiment VARCHAR(32)
    `);

    // 3. 创建 document_classifications 表
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS document_classifications (
        content_item_id UUID NOT NULL REFERENCES content_item(id) ON DELETE CASCADE,
        category_id UUID NOT NULL REFERENCES content_category(id) ON DELETE CASCADE,
        confidence FLOAT,
        manual_reviewed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (content_item_id, category_id)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_doc_classifications_item ON document_classifications(content_item_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_doc_classifications_category ON document_classifications(category_id)
    `);

    // 4. 创建 etl_jobs 表
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS etl_jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        source_file VARCHAR(512) NOT NULL,
        parser VARCHAR(128),
        total_items INT DEFAULT 0,
        success_items INT DEFAULT 0,
        failed_items INT DEFAULT 0,
        status VARCHAR(32) DEFAULT 'pending',
        error_message TEXT,
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_etl_jobs_status ON etl_jobs(status)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_etl_jobs_created ON etl_jobs(created_at)
    `);

    // 5. 插入预置分类数据 - 第一层：信息载体
    await queryRunner.query(`
      INSERT INTO content_category (name, code, layer, description, sort_order) VALUES
      ('结构化文档', 'STRUCTURED_DOC', 'carrier', 'PDF研报、公告等结构化文档', 1),
      ('半结构化音频', 'SEMI_STRUCTURED_AUDIO', 'carrier', 'MP3会议、路演录音等半结构化音频', 2),
      ('非结构化短文本', 'UNSTRUCTURED_TEXT', 'carrier', '快讯、推送等非结构化短文本', 3)
      ON CONFLICT (code) DO NOTHING
    `);

    // 第二层：信息类型
    await queryRunner.query(`
      INSERT INTO content_category (name, code, layer, parent_code, description, sort_order) VALUES
      ('研报类', 'RESEARCH_REPORT', 'info_type', 'STRUCTURED_DOC', '深度/点评/策略/行业研究报告', 1),
      ('会议类', 'CONFERENCE', 'info_type', 'SEMI_STRUCTURED_AUDIO', '业绩会/路演/专家访谈/策略会', 2),
      ('快讯类', 'FLASH_NEWS', 'info_type', 'UNSTRUCTURED_TEXT', '事件/数据/政策/异动快讯', 3),
      ('公告类', 'ANNOUNCEMENT', 'info_type', 'STRUCTURED_DOC', '定期报告/临时公告', 4)
      ON CONFLICT (code) DO NOTHING
    `);

    // 第三层：金融维度
    await queryRunner.query(`
      INSERT INTO content_category (name, code, layer, description, sort_order) VALUES
      ('股票', 'ASSET_STOCK', 'financial', '股票资产类别', 1),
      ('债券', 'ASSET_BOND', 'financial', '债券资产类别', 2),
      ('商品', 'ASSET_COMMODITY', 'financial', '商品资产类别', 3),
      ('外汇', 'ASSET_FOREX', 'financial', '外汇资产类别', 4),
      ('衍生品', 'ASSET_DERIVATIVE', 'financial', '衍生品资产类别', 5),
      ('行业板块', 'INDUSTRY', 'financial', '申万/中信行业分类', 6),
      ('强烈看多', 'VIEWPOINT_STRONG_BUY', 'financial', '强烈看多观点', 7),
      ('强烈看空', 'VIEWPOINT_STRONG_SELL', 'financial', '强烈看空观点', 8),
      ('中性判断', 'VIEWPOINT_NEUTRAL', 'financial', '中性判断观点', 9),
      ('事实陈述', 'VIEWPOINT_FACT', 'financial', '事实陈述', 10),
      ('公开', 'SENSITIVITY_PUBLIC', 'financial', '公开信息', 11),
      ('半公开', 'SENSITIVITY_INTERNAL', 'financial', '半公开信息', 12),
      ('内部', 'SENSITIVITY_RESTRICTED', 'financial', '内部信息', 13)
      ON CONFLICT (code) DO NOTHING
    `);

    // 6. 创建索引优化查询性能
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_content_item_parser ON content_item(parser)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_content_item_sentiment ON content_item(sentiment)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_content_item_entry_id ON content_item(entry_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_content_item_content_timestamp ON content_item(content_timestamp)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_content_category_layer ON content_category(layer)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_content_category_parent_code ON content_category(parent_code)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 回滚索引
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_content_category_parent_code`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS idx_content_category_layer`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_content_item_content_timestamp`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS idx_content_item_entry_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_content_item_sentiment`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_content_item_parser`);

    // 回滚表
    await queryRunner.query(`DROP TABLE IF EXISTS etl_jobs`);
    await queryRunner.query(`DROP TABLE IF EXISTS document_classifications`);

    // 回滚 content_item 列
    await queryRunner.query(`
      ALTER TABLE content_item
      DROP COLUMN IF EXISTS sentiment,
      DROP COLUMN IF EXISTS companies,
      DROP COLUMN IF EXISTS content_timestamp,
      DROP COLUMN IF EXISTS entry_id,
      DROP COLUMN IF EXISTS entry_index,
      DROP COLUMN IF EXISTS report_date,
      DROP COLUMN IF EXISTS parser,
      DROP COLUMN IF EXISTS source_file
    `);

    // 回滚 content_category 列
    await queryRunner.query(`
      ALTER TABLE content_category
      DROP COLUMN IF EXISTS metadata,
      DROP COLUMN IF EXISTS parent_code,
      DROP COLUMN IF EXISTS layer
    `);

    // 清理预置分类数据（可选）
    await queryRunner.query(`
      DELETE FROM content_category WHERE layer IN ('carrier', 'info_type', 'financial')
    `);
  }
}
