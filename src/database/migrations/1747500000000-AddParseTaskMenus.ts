import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddParseTaskMenus1747500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Insert Parse Tasks menu
    await queryRunner.query(`
      INSERT INTO menu (id, name, code, icon, path, "parentId", "sortOrder", status, "createdAt", "updatedAt")
      VALUES (
        gen_random_uuid()::uuid,
        '解析任务',
        'parse-tasks',
        'FileJson',
        '/parse/tasks',
        NULL,
        7,
        'active',
        NOW(),
        NOW()
      )
    `);

    // Insert Versions menu
    await queryRunner.query(`
      INSERT INTO menu (id, name, code, icon, path, "parentId", "sortOrder", status, "createdAt", "updatedAt")
      VALUES (
        gen_random_uuid()::uuid,
        '版本管理',
        'versions',
        'Layers',
        '/versions',
        NULL,
        8,
        'active',
        NOW(),
        NOW()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM menu WHERE code IN ('parse-tasks', 'versions')`,
    );
  }
}
