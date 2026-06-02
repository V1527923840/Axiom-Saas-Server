import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMenus1781000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Insert Scrape Log menu
    await queryRunner.query(`
      INSERT INTO menu (id, name, code, icon, path, "parentId", "sortOrder", status, "createdAt", "updatedAt")
      SELECT gen_random_uuid(), '爬虫日志', 'scrape-logs', 'Bot', '/scrape-logs', NULL, 5, 'active', NOW(), NOW()
      WHERE NOT EXISTS (SELECT 1 FROM menu WHERE code = 'scrape-logs')
    `);

    // Insert OSS Browser menu
    await queryRunner.query(`
      INSERT INTO menu (id, name, code, icon, path, "parentId", "sortOrder", status, "createdAt", "updatedAt")
      SELECT gen_random_uuid(), '文件管理', 'oss-browser', 'Folder', '/oss-browser', NULL, 4, 'active', NOW(), NOW()
      WHERE NOT EXISTS (SELECT 1 FROM menu WHERE code = 'oss-browser')
    `);

    // Insert Parse Tasks menu
    await queryRunner.query(`
      INSERT INTO menu (id, name, code, icon, path, "parentId", "sortOrder", status, "createdAt", "updatedAt")
      SELECT gen_random_uuid(), '解析任务', 'parse-tasks', 'FileJson', '/parse/tasks', NULL, 7, 'active', NOW(), NOW()
      WHERE NOT EXISTS (SELECT 1 FROM menu WHERE code = 'parse-tasks')
    `);

    // Insert Versions menu
    await queryRunner.query(`
      INSERT INTO menu (id, name, code, icon, path, "parentId", "sortOrder", status, "createdAt", "updatedAt")
      SELECT gen_random_uuid(), '版本管理', 'versions', 'Layers', '/versions', NULL, 8, 'active', NOW(), NOW()
      WHERE NOT EXISTS (SELECT 1 FROM menu WHERE code = 'versions')
    `);

    // Insert Intelligence menu
    await queryRunner.query(`
      INSERT INTO menu (id, name, code, icon, path, "parentId", "sortOrder", status, "createdAt", "updatedAt")
      SELECT gen_random_uuid(), '情报精选', 'intelligence', 'Star', '/content/intelligence', NULL, 5, 'active', NOW(), NOW()
      WHERE NOT EXISTS (SELECT 1 FROM menu WHERE code = 'intelligence')
    `);

    // Assign all menus to Admin role (roleId = 2)
    await queryRunner.query(`
      INSERT INTO role_menu ("roleId", "menuId")
      SELECT 2, id FROM menu WHERE code = 'scrape-logs'
      AND NOT EXISTS (SELECT 1 FROM role_menu WHERE "roleId" = 2 AND "menuId" = (SELECT id FROM menu WHERE code = 'scrape-logs'))
    `);

    await queryRunner.query(`
      INSERT INTO role_menu ("roleId", "menuId")
      SELECT 2, id FROM menu WHERE code = 'oss-browser'
      AND NOT EXISTS (SELECT 1 FROM role_menu WHERE "roleId" = 2 AND "menuId" = (SELECT id FROM menu WHERE code = 'oss-browser'))
    `);

    await queryRunner.query(`
      INSERT INTO role_menu ("roleId", "menuId")
      SELECT 2, id FROM menu WHERE code = 'parse-tasks'
      AND NOT EXISTS (SELECT 1 FROM role_menu WHERE "roleId" = 2 AND "menuId" = (SELECT id FROM menu WHERE code = 'parse-tasks'))
    `);

    await queryRunner.query(`
      INSERT INTO role_menu ("roleId", "menuId")
      SELECT 2, id FROM menu WHERE code = 'versions'
      AND NOT EXISTS (SELECT 1 FROM role_menu WHERE "roleId" = 2 AND "menuId" = (SELECT id FROM menu WHERE code = 'versions'))
    `);

    await queryRunner.query(`
      INSERT INTO role_menu ("roleId", "menuId")
      SELECT 2, id FROM menu WHERE code = 'intelligence'
      AND NOT EXISTS (SELECT 1 FROM role_menu WHERE "roleId" = 2 AND "menuId" = (SELECT id FROM menu WHERE code = 'intelligence'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM role_menu WHERE "menuId" IN (SELECT id FROM menu WHERE code IN ('scrape-logs', 'oss-browser', 'parse-tasks', 'versions', 'intelligence'))`,
    );
    await queryRunner.query(
      `DELETE FROM menu WHERE code IN ('scrape-logs', 'oss-browser', 'parse-tasks', 'versions', 'intelligence')`,
    );
  }
}
