import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddImageUrlsToZsxqPosts1781000002000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE zsxq_posts
      ADD COLUMN IF NOT EXISTS image_urls jsonb DEFAULT '[]'::jsonb
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_zsxq_image_urls
      ON zsxq_posts USING GIN (image_urls)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_zsxq_image_urls`);
    await queryRunner.query(
      `ALTER TABLE zsxq_posts DROP COLUMN IF EXISTS image_urls`,
    );
  }
}
