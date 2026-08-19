import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add skill_file.entry_name column.
 *
 * Background: SkillFileEntity has had `entryName` since 2026-08-18 (FIX-6
 * commit) but the original CreateSkillTables migration
 * (1794000000000) did NOT include this column. The entity field is mapped
 * to `entry_name varchar(512) nullable` but the DB never got the column,
 * meaning `skill-upload.service.ts:331` `entryName: entry.entryName` would
 * fail with "column entry_name does not exist" against a freshly migrated
 * DB (tests pass only because they mock the repository).
 *
 * This migration brings the schema in line with the entity so the
 * spec §2.1 zip-layout refactor (Task 2) can write entry names without
 * hitting a real DB error.
 *
 * Idempotent (`IF NOT EXISTS`) so it is safe to re-run.
 */
export class AddSkillFileEntryName1794000000002 implements MigrationInterface {
  name = 'AddSkillFileEntryName1794000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE skill_file ADD COLUMN IF NOT EXISTS entry_name varchar(512)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE skill_file DROP COLUMN IF EXISTS entry_name
    `);
  }
}
