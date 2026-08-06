import { MigrationInterface, QueryRunner } from 'typeorm';

export class MoveVibeTradingUnderSystem1786000298066 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Re-parent the vibe-trading menu under the existing "系统" (system) group so
    // the sidebar (which only renders children of root groups) shows it.
    // Without a parent, the sidebar's convertMenuToNavGroups filters it out.
    await queryRunner.query(`
      UPDATE menu
      SET "parentId" = (
        SELECT id FROM menu WHERE code = 'system' AND "parentId" IS NULL LIMIT 1
      ),
          "sortOrder" = 3,
          "icon" = 'Bot'
      WHERE code = 'vibe-trading'
        AND "parentId" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE menu
      SET "parentId" = NULL, "sortOrder" = 50
      WHERE code = 'vibe-trading'
    `);
  }
}
