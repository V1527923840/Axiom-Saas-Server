import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropResearchAnalysisPublishDate1790100000000 implements MigrationInterface {
  name = 'DropResearchAnalysisPublishDate1790100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // The previous migration (1790000000000) renamed `analyzed_at` →
    // `publish_date` after the operators asked for the search filter
    // to be called "发布日期". After seeing the UI, they decided the
    // search label should be "收录日期" and the publish-date column
    // should not exist at all — they want the search to filter the
    // existing `created_at` column (when the row was created in the
    // table) instead.
    //
    // Idempotent: drops `publish_date` if it exists (the upstream rename
    // may or may not have run depending on the deploy). When the operator
    // reverts this migration, `publish_date` is re-created as a plain
    // `timestamp` so that the previous migration (1790000000000) doesn't
    // blow up on second-run with the renamed-from column gone.
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'research_analysis'
            AND column_name = 'publish_date'
        ) THEN
          ALTER TABLE "research_analysis" DROP COLUMN "publish_date";
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-add the column so a subsequent revert of 1790000000000 can
    // rename back. We do NOT backfill data — historical rows would have
    // gotten a NULL `publish_date` from the upstream rename anyway, and
    // the column is being retired in the long-term UI anyway.
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'research_analysis'
            AND column_name = 'publish_date'
        ) THEN
          ALTER TABLE "research_analysis"
            ADD COLUMN "publish_date" timestamp NULL;
        END IF;
      END $$;
    `);
  }
}
