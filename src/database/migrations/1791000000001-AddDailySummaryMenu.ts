import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add the '报告管理' / daily-summary menu entry under the existing
 * 'dashboard' parent (per the brief: path '/dashboard/summaries').
 *
 * Lives in a migration (not the menu seed) per
 * src/database/CLAUDE.md — the seed's `existingMenus > 0` guard means
 * already-seeded DBs would never see this row. The migration is
 * idempotent (`WHERE NOT EXISTS`) so it is safe to re-run.
 *
 * Roles:
 *   1 = super_admin (bypasses MenuAccessGuard anyway, but we still
 *       assign for completeness with the seed's behavior)
 *   2 = admin       (the only role that requires explicit role_menu
 *                    assignments to see the sidebar entry)
 */
export class AddDailySummaryMenu1791000000001 implements MigrationInterface {
  name = 'AddDailySummaryMenu1791000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Insert the menu under the existing 'dashboard' parent.
    await queryRunner.query(`
      INSERT INTO menu (id, name, code, icon, path, "parentId", "sortOrder", status, "createdAt", "updatedAt")
      SELECT
        gen_random_uuid(),
        '报告管理',
        'daily-summary',
        'FileText',
        '/dashboard/summaries',
        (SELECT id FROM menu WHERE code = 'dashboard'),
        2,
        'active',
        NOW(),
        NOW()
      WHERE NOT EXISTS (SELECT 1 FROM menu WHERE code = 'daily-summary')
    `);

    // Assign to super_admin (roleId = 1) — matches menu-seed.service.ts
    await queryRunner.query(`
      INSERT INTO role_menu ("roleId", "menuId")
      SELECT 1, id FROM menu WHERE code = 'daily-summary'
      AND NOT EXISTS (
        SELECT 1 FROM role_menu
        WHERE "roleId" = 1
          AND "menuId" = (SELECT id FROM menu WHERE code = 'daily-summary')
      )
    `);

    // Assign to admin (roleId = 2) — required so the sidebar shows it.
    await queryRunner.query(`
      INSERT INTO role_menu ("roleId", "menuId")
      SELECT 2, id FROM menu WHERE code = 'daily-summary'
      AND NOT EXISTS (
        SELECT 1 FROM role_menu
        WHERE "roleId" = 2
          AND "menuId" = (SELECT id FROM menu WHERE code = 'daily-summary')
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM role_menu
      WHERE "menuId" IN (SELECT id FROM menu WHERE code = 'daily-summary')
    `);
    await queryRunner.query(`
      DELETE FROM menu WHERE code = 'daily-summary'
    `);
  }
}
