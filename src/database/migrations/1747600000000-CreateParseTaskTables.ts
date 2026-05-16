import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateParseTaskTables1747600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create parse_task_logs table
    // Note: extraction_log_id is nullable and not enforced as FK since extraction_logs is in Agent's DB
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS parse_task_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        scrape_log_id UUID NOT NULL REFERENCES scrape_log(id) ON DELETE CASCADE,
        extraction_log_id UUID,
        source VARCHAR(64) NOT NULL,
        version VARCHAR(128) NOT NULL,
        source_file_key VARCHAR(512) NOT NULL,
        source_filename VARCHAR(256),
        output_json_key VARCHAR(512),
        output_md_key VARCHAR(512),
        status VARCHAR(32) DEFAULT 'pending',
        error_message TEXT,
        retry_count INT DEFAULT 0,
        parser VARCHAR(128),
        parse_duration_ms BIGINT,
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        metadata JSONB DEFAULT '{}'
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_parse_task_source_version ON parse_task_logs(source, version)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_parse_task_status ON parse_task_logs(status)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_parse_task_scrape_log_id ON parse_task_logs(scrape_log_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_parse_task_extraction_log_id ON parse_task_logs(extraction_log_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_parse_task_created ON parse_task_logs(created_at)
    `);

    // Create parse_task_assets table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS parse_task_assets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        parse_task_id UUID NOT NULL REFERENCES parse_task_logs(id) ON DELETE CASCADE,
        asset_type VARCHAR(32) NOT NULL,
        minio_object_key VARCHAR(512) NOT NULL,
        file_size BIGINT,
        checksum VARCHAR(64),
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_parse_task_assets_task_id ON parse_task_assets(parse_task_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS parse_task_assets`);
    await queryRunner.query(`DROP TABLE IF EXISTS parse_task_logs`);
  }
}
