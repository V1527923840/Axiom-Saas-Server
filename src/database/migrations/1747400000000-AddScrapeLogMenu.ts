import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddScrapeLogMenu1747400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Insert Scrape Log menu
    await queryRunner.query(`
      INSERT INTO menu (id, name, code, icon, path, "parentId", "sortOrder", status, "createdAt", "updatedAt")
      VALUES (
        gen_random_uuid()::uuid,
        '爬虫日志',
        'scrape-logs',
        'Bot',
        '/scrape-logs',
        NULL,
        5,
        'active',
        NOW(),
        NOW()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM menu WHERE code = 'scrape-logs'`);
  }
}
