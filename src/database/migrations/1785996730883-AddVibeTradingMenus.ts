import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVibeTradingMenus1785996730883 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Insert the /vibe-trading menu entry. gen_random_uuid() matches
    // the convention used by the 1781000000000-AddMenus.ts menu
    // migration; the menu table defaults to uuid_generate_v4() but
    // recent migrations standardise on gen_random_uuid() (PG13+).
    await queryRunner.query(`
      INSERT INTO menu (id, name, code, icon, path, "parentId", "sortOrder", status, "createdAt", "updatedAt")
      SELECT gen_random_uuid(), 'AI Vibe Trading', 'vibe-trading', 'Bot', '/vibe-trading', NULL, 50, 'active', NOW(), NOW()
      WHERE NOT EXISTS (SELECT 1 FROM menu WHERE code = 'vibe-trading')
    `);

    // Assign to every role so every logged-in user sees the sidebar
    // entry. The brief's `WHERE r.status = 'active'` is dropped: the
    // `role` table has no `status` column (only id/name/code/description
    // — see migration 1790200000000-AddRoleIdSequenceAndCode), so the
    // filter would yield an "unknown column" error. ON CONFLICT DO
    // NOTHING keeps the assignment idempotent across re-runs.
    await queryRunner.query(`
      INSERT INTO role_menu ("roleId", "menuId")
      SELECT r.id, m.id
      FROM role r, menu m
      WHERE m.code = 'vibe-trading'
      ON CONFLICT ("roleId", "menuId") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM role_menu
      WHERE "menuId" IN (SELECT id FROM menu WHERE code = 'vibe-trading')
    `);
    await queryRunner.query(`
      DELETE FROM menu WHERE code = 'vibe-trading'
    `);
  }
}
