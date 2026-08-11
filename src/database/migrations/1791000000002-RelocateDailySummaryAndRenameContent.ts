import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adjust the menu structure for the daily-summary feature per product feedback:
 *
 * 1. The '报告管理' (daily-summary) menu was previously placed under '仪表盘'
 *    (code='dashboard') per the original brief. Product wants it under the
 *    '内容管理' (code='content') group instead — report management is a
 *    content concern, not a dashboard one.
 *
 * 2. The '内容管理' group is renamed to '知识库' (Knowledge Base) for the
 *    same reason — daily and weekly briefs are knowledge content.
 *
 * Idempotent: safe to re-run. Does not touch the menu `code` column
 * (still 'content') so no foreign keys or role_menu lookups break.
 */
export class RelocateDailySummaryAndRenameContent1791000000002 implements MigrationInterface {
  name = 'RelocateDailySummaryAndRenameContent1791000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Re-parent '报告管理' from '仪表盘' (code='dashboard') to
    //    '内容管理' (code='content').
    await queryRunner.query(`
      UPDATE menu
      SET "parentId" = (SELECT id FROM menu WHERE code = 'content'),
          "updatedAt" = NOW()
      WHERE code = 'daily-summary'
        AND "parentId" IS DISTINCT FROM (SELECT id FROM menu WHERE code = 'content')
    `);

    // 2. Rename the '内容管理' group to '知识库'.
    await queryRunner.query(`
      UPDATE menu
      SET name = '知识库',
          "updatedAt" = NOW()
      WHERE code = 'content'
        AND name <> '知识库'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore the original layout.
    await queryRunner.query(`
      UPDATE menu
      SET name = '内容管理',
          "updatedAt" = NOW()
      WHERE code = 'content'
    `);
    await queryRunner.query(`
      UPDATE menu
      SET "parentId" = (SELECT id FROM menu WHERE code = 'dashboard'),
          "updatedAt" = NOW()
      WHERE code = 'daily-summary'
    `);
  }
}
