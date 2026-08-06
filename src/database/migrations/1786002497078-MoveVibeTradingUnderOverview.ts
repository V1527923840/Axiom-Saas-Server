import { MigrationInterface, QueryRunner } from 'typeorm';

export class MoveVibeTradingUnderOverview1786002497078 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Re-parent vibe-trading under the "概览" (overview) group and rename it
    // "智能体" so it appears under the overview group in the sidebar.
    await queryRunner.query(`
      UPDATE menu
      SET "parentId" = (
        SELECT id FROM menu WHERE code = 'overview' AND "parentId" IS NULL LIMIT 1
      ),
          "name" = '智能体',
          "sortOrder" = 2
      WHERE code = 'vibe-trading'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE menu
      SET "parentId" = (
        SELECT id FROM menu WHERE code = 'system' AND "parentId" IS NULL LIMIT 1
      ),
          "name" = 'AI Vibe Trading',
          "sortOrder" = 3
      WHERE code = 'vibe-trading'
    `);
  }
}
