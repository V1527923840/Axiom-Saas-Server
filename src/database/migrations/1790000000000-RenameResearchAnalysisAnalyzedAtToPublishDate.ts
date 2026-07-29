import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameResearchAnalysisAnalyzedAtToPublishDate1790000000000 implements MigrationInterface {
  name = 'RenameResearchAnalysisAnalyzedAtToPublishDate1790000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Rename the column only. PostgreSQL's RENAME COLUMN also updates
    // any indexes that reference the column under the hood, so the
    // existing `@Index()` decorator on the entity will keep working
    // after we re-deploy (TypeORM does not generate a fixed index name
    // for `@Index()` without arguments, so there is nothing to rename).
    //
    // Why rename rather than add a new column: keeps the existing data
    // (every historical row carries a value that we now call "publish
    // date"). Operators were already treating this column as the public
    // release date from the editor UI; this migration just aligns the
    // schema with that intent.
    await queryRunner.query(
      `ALTER TABLE "research_analysis" RENAME COLUMN "analyzed_at" TO "publish_date"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "research_analysis" RENAME COLUMN "publish_date" TO "analyzed_at"`,
    );
  }
}
