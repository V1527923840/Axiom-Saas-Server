import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserSubscriptionFields1747000002000 implements MigrationInterface {
  name = 'AddUserSubscriptionFields1747000002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD COLUMN "tier" character varying NOT NULL DEFAULT 'Lv0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD COLUMN "currentPlanId" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD COLUMN "pointsBalance" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD COLUMN "chatQuotaUsed" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD COLUMN "chatQuotaTotal" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD COLUMN "subscriptionExpiredAt" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD COLUMN "registeredAt" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD COLUMN "lastLoginAt" TIMESTAMP WITH TIME ZONE`,
    );

    await queryRunner.query(`CREATE INDEX "IDX_users_tier" ON "user" ("tier")`);
    await queryRunner.query(
      `CREATE INDEX "IDX_users_registered_at" ON "user" ("registeredAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_users_last_login_at" ON "user" ("lastLoginAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_users_last_login_at"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_users_registered_at"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_users_tier"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "lastLoginAt"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "registeredAt"`);
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN "subscriptionExpiredAt"`,
    );
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "chatQuotaTotal"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "chatQuotaUsed"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "pointsBalance"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "currentPlanId"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "tier"`);
  }
}
