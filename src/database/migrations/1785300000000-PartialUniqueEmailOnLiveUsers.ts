import { MigrationInterface, QueryRunner } from 'typeorm';

export class PartialUniqueEmailOnLiveUsers1785300000000 implements MigrationInterface {
  name = 'PartialUniqueEmailOnLiveUsers1785300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // The original UNIQUE(email) constraint fires for soft-deleted rows too,
    // so re-using the email of a previously deleted user always raised a
    // 500 unique-violation error instead of allowing recreation.
    //
    // Replace the global constraint with a partial UNIQUE INDEX that only
    // covers rows where deletedAt IS NULL. Soft-deleted rows still occupy
    // the email value but no longer block a fresh insert.
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_user_email_active" ON "user" (email) WHERE "deletedAt" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "UQ_user_email_active"`);
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE (email)`,
    );
  }
}
