import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixInvalidSubscriptionPlanIds1778556219694 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Find subscriptions with invalid planId (not UUID format)
    // UUID stored as text might not match valid UUID pattern
    await queryRunner.query(`
            UPDATE "subscription"
            SET "planId" = NULL
            WHERE "planId" IS NOT NULL
            AND length("planId"::text) != 36
            OR "planId"::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        `);
  }

  public async down(): Promise<void> {
    // This migration sets invalid planIds to NULL, not reversible
  }
}
