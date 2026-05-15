import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOssBrowserMenu1778747586494 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Insert OSS Browser menu
    await queryRunner.query(`
      INSERT INTO menu (id, name, code, icon, path, "parentId", "sortOrder", status, "createdAt", "updatedAt")
      VALUES (
        gen_random_uuid()::uuid,
        '文件管理',
        'oss-browser',
        'Folder',
        '/oss-browser',
        NULL,
        4,
        'active',
        NOW(),
        NOW()
      )
    `);

    // Assign to Admin role (roleId = 2)
    await queryRunner.query(`
      INSERT INTO role_menu ("roleId", "menuId")
      SELECT 2, id FROM menu WHERE code = 'oss-browser'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM role_menu WHERE "menuId" IN (SELECT id FROM menu WHERE code = 'oss-browser')`,
    );
    await queryRunner.query(`DELETE FROM menu WHERE code = 'oss-browser'`);
  }
}
