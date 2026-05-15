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

    // Assign to Admin role (roleId = 2)
    await queryRunner.query(`
      INSERT INTO role_menu ("roleId", "menuId")
      SELECT 2, id FROM menu WHERE code = 'scrape-logs'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM role_menu WHERE "menuId" IN (SELECT id FROM menu WHERE code = 'scrape-logs')`,
    );
    await queryRunner.query(`DELETE FROM menu WHERE code = 'scrape-logs'`);
  }
}
