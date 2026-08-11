import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Promote '报告管理' (code='daily-summary') into a new parent group
 * '报告中心' (code='reports'):
 *
 *   1. Make room for the new parent at sortOrder=2: shift 'content'
 *      (知识库) from 2→3 and 'user-subscription' (用户与订阅) from
 *      3→4. The repo orders menus by sortOrder ASC with no tiebreaker
 *      (see menu.repository.ts), so leaving any two root menus at the
 *      same sortOrder would make sidebar order non-deterministic.
 *   2. Insert a new top-level menu `code='reports', name='报告中心',
 *      path='/reports', parentId=NULL, sortOrder=2`.
 *   3. Grant it to Admin (roleId=2) and Super Admin (roleId=1).
 *   4. Re-parent the existing 'daily-summary' entry under it, rename
 *      it to '日报 / 周报', and move its path from
 *      '/dashboard/summaries' to '/reports/daily-summary' so the menu
 *      tree, page route, and ProtectedRoute menuPaths all line up.
 *
 * Idempotent: every UPDATE / INSERT is guarded by NOT EXISTS or
 * IS DISTINCT FROM, so the migration is safe to re-run.
 */
export class IntroduceReportsMenuAndRelocateDailySummary1791000000003 implements MigrationInterface {
  name = 'IntroduceReportsMenuAndRelocateDailySummary1791000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Make room for the new 'reports' parent at sortOrder=2 by
    //    shifting content (2→3) and user-subscription (3→4). Both
    //    updates are guarded so re-runs are no-ops.
    await queryRunner.query(`
      UPDATE menu
      SET "sortOrder" = 3, "updatedAt" = NOW()
      WHERE code = 'content' AND "sortOrder" < 3
    `);
    await queryRunner.query(`
      UPDATE menu
      SET "sortOrder" = 4, "updatedAt" = NOW()
      WHERE code = 'user-subscription' AND "sortOrder" < 4
    `);

    // 2. Insert the parent menu if missing.
    await queryRunner.query(`
      INSERT INTO menu (id, name, code, path, "parentId", "sortOrder", icon, status, "createdAt", "updatedAt")
      SELECT gen_random_uuid()::uuid, '报告中心', 'reports', '/reports', NULL, 2, 'BarChart3', 'active', NOW(), NOW()
      WHERE NOT EXISTS (SELECT 1 FROM menu WHERE code = 'reports')
    `);

    // Backfill icon for an already-inserted `reports` row (covers the
    // case where the migration ran before this column was added). Guarded
    // so the upgrade is a no-op once the icon is in place.
    await queryRunner.query(`
      UPDATE menu
      SET icon = 'BarChart3', "updatedAt" = NOW()
      WHERE code = 'reports' AND (icon IS NULL OR icon = '')
    `);

    // 3. Grant the new menu to Admin (roleId=2) and Super Admin (roleId=1).
    await queryRunner.query(`
      INSERT INTO role_menu ("roleId", "menuId")
      SELECT 2, id FROM menu WHERE code = 'reports'
        AND NOT EXISTS (
          SELECT 1 FROM role_menu rm
          WHERE rm."roleId" = 2 AND rm."menuId" = menu.id
        )
    `);
    await queryRunner.query(`
      INSERT INTO role_menu ("roleId", "menuId")
      SELECT 1, id FROM menu WHERE code = 'reports'
        AND NOT EXISTS (
          SELECT 1 FROM role_menu rm
          WHERE rm."roleId" = 1 AND rm."menuId" = menu.id
        )
    `);

    // 4. Move daily-summary under reports + new path + new name + new sortOrder.
    await queryRunner.query(`
      UPDATE menu
      SET name = '日报 / 周报',
          path = '/reports/daily-summary',
          "parentId" = (SELECT id FROM menu WHERE code = 'reports'),
          "sortOrder" = 1,
          "updatedAt" = NOW()
      WHERE code = 'daily-summary'
        AND (
          name <> '日报 / 周报'
          OR path <> '/reports/daily-summary'
          OR "parentId" IS DISTINCT FROM (SELECT id FROM menu WHERE code = 'reports')
          OR "sortOrder" <> 1
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore the original layout.
    await queryRunner.query(`
      UPDATE menu
      SET name = '报告管理',
          path = '/dashboard/summaries',
          "parentId" = (SELECT id FROM menu WHERE code = 'content'),
          "sortOrder" = 2,
          "updatedAt" = NOW()
      WHERE code = 'daily-summary'
    `);
    await queryRunner.query(`
      DELETE FROM role_menu
      WHERE "menuId" IN (SELECT id FROM menu WHERE code = 'reports')
    `);
    await queryRunner.query(`
      DELETE FROM menu WHERE code = 'reports'
    `);
    // Restore 'content' to sortOrder=2 and 'user-subscription' to 3, but
    // only if their current sortOrder matches what up() set them to (3 and
    // 4 respectively). If another migration has since moved either row,
    // leave it alone rather than colliding with newer state.
    await queryRunner.query(`
      UPDATE menu
      SET "sortOrder" = 2, "updatedAt" = NOW()
      WHERE code = 'content' AND "sortOrder" = 3
    `);
    await queryRunner.query(`
      UPDATE menu
      SET "sortOrder" = 3, "updatedAt" = NOW()
      WHERE code = 'user-subscription' AND "sortOrder" = 4
    `);
  }
}
