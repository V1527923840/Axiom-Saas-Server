import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 创建 `research_analysis` 表。
 *
 * ## 为什么需要这个迁移
 *
 * 仓库里**从来没有**创建过这张表的迁移,但后续多个迁移都在 ALTER 它:
 *
 * - `1781000003000-AddPyramidViewToZsxqAndResearch` —— DROP 旧评分列、
 *   收紧 version/oss_url/local_path 类型、加金字塔列
 * - `1790000000000-RenameResearchAnalysisAnalyzedAtToPublishDate` —— RENAME
 *   `analyzed_at` → `publish_date`
 * - `1790100000000-DropResearchAnalysisPublishDate` —— DROP `publish_date`
 *
 * 生产库之所以能跑通,是因为这张表是在迁移体系之外手工建的(或早期依赖
 * `synchronize: true`)。代价是:**全新环境跑迁移链必然断在**
 * `AddPyramidViewToZsxqAndResearch`,报
 * `relation "research_analysis" does not exist` —— 这正是 CI 长期 red 的原因。
 *
 * ## 时间戳为什么是 1781000002500
 *
 * 必须排在 `1781000003000-AddPyramidViewToZsxqAndResearch` **之前**,
 * 否则后面那个迁移 ALTER 时表还不存在。1781000002500 正好落在
 * `1781000002000-AddImageUrlsToZsxqPosts` 与 `1781000003000` 之间。
 *
 * ## 对生产库的影响:无
 *
 * `CREATE TABLE IF NOT EXISTS` 在表已存在时完全不做任何事(不校验 schema),
 * 所以生产库执行后表结构、索引、数据均不受影响,只是把这条迁移记录进
 * `migrations` 表。
 *
 * ## 表结构来源
 *
 * 与 `ResearchAnalysisEntity`(`src/research/infrastructure/persistence/
 * relational/entities/research-analysis.entity.ts`)保持一致,并保留
 * `analyzed_at` 列 —— 后续 `1790000000000` 要 RENAME 它,再由
 * `1790100000000` 删掉。
 */
export class CreateResearchAnalysisTable1781000002500 implements MigrationInterface {
  name = 'CreateResearchAnalysisTable1781000002500';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS research_analysis (
        id SERIAL PRIMARY KEY,
        version VARCHAR(50) NOT NULL,
        document_name VARCHAR(255) NOT NULL,
        doc_type VARCHAR(50),
        source_file_key VARCHAR(500),
        oss_url VARCHAR(500),
        local_path VARCHAR(500),
        scrape_log_id VARCHAR(50),
        category_l1 VARCHAR(50),
        category_l2 VARCHAR(100),
        sw_industry_tag JSONB,
        mentioned_stocks JSONB,
        key_thesis TEXT,
        analysis_version VARCHAR(20),
        -- 后续被 1790000000000 重命名为 publish_date,再由 1790100000000 删除
        analyzed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // 与 entity 上的 @Index() 装饰器保持一致。
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_research_document_name
        ON research_analysis (document_name)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_research_source_file_key
        ON research_analysis (source_file_key)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_research_scrape_log_id
        ON research_analysis (scrape_log_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_research_category_l1
        ON research_analysis (category_l1)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_research_category_l2
        ON research_analysis (category_l2)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS research_analysis`);
  }
}
