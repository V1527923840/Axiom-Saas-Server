import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateContentTables1704067200000 implements MigrationInterface {
  name = 'CreateContentTables1704067200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create content_category table
    await queryRunner.query(`
      CREATE TABLE content_category (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        code VARCHAR(50) NOT NULL UNIQUE,
        description TEXT,
        sort_order INT DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create content_item table
    await queryRunner.query(`
      CREATE TABLE content_item (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        category_id UUID NOT NULL REFERENCES content_category(id),
        title VARCHAR(500) NOT NULL,
        summary VARCHAR(1000),
        original_content TEXT,
        source_file_url VARCHAR(1000),
        json_file_url VARCHAR(1000),
        summary_file_url VARCHAR(1000),
        images JSONB DEFAULT '[]',
        audio_url VARCHAR(1000),
        transcript TEXT,
        published_at TIMESTAMP WITH TIME ZONE,
        collected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(20) DEFAULT 'active',
        metadata JSONB DEFAULT '{}',
        deleted_at TIMESTAMP WITH TIME ZONE
      );
    `);

    // Create indexes for content_item
    await queryRunner.query(`
      CREATE INDEX idx_content_item_category_id ON content_item(category_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_content_item_collected_at ON content_item(collected_at);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_content_item_published_at ON content_item(published_at);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_content_item_status ON content_item(status);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_content_item_deleted_at ON content_item(deleted_at);
    `);

    // Insert initial category data
    await queryRunner.query(`
      INSERT INTO content_category (name, code, description, sort_order) VALUES
      ('每日消息', 'daily-news', '每日资讯新闻内容', 1),
      ('音频解读', 'audio-interpretation', '音频转文字解读内容', 2),
      ('机构研报', 'institution-reports', '机构发布的研究报告', 3);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS content_item;`);
    await queryRunner.query(`DROP TABLE IF EXISTS content_category;`);
  }
}
