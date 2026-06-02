import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOriginalTextRawToZsxqPosts implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE zsxq_posts
      ADD COLUMN IF NOT EXISTS original_text_raw TEXT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE zsxq_posts
      DROP COLUMN IF EXISTS original_text_raw
    `);
  }
}
