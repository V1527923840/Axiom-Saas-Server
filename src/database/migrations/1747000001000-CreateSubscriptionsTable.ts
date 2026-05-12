import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSubscriptionsTable1747000001000 implements MigrationInterface {
  name = 'CreateSubscriptionsTable1747000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "subscription" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "planId" uuid NOT NULL, "planName" character varying NOT NULL, "cycle" character varying NOT NULL, "price" numeric(10,2) NOT NULL DEFAULT 0, "subscribedAt" TIMESTAMP NOT NULL DEFAULT now(), "expiredAt" TIMESTAMP WITH TIME ZONE NOT NULL, "status" character varying NOT NULL DEFAULT 'active', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_96c930796b046f06b28e1175955" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_subscriptions_user_id" ON "subscription" ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_subscriptions_plan_id" ON "subscription" ("planId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_subscriptions_status" ON "subscription" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_subscriptions_expired_at" ON "subscription" ("expiredAt") `,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription" ADD CONSTRAINT "FK_subscription_plan" FOREIGN KEY ("planId") REFERENCES "plan"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "subscription" DROP CONSTRAINT "FK_subscription_plan"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_subscriptions_expired_at"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_subscriptions_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_subscriptions_plan_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_subscriptions_user_id"`);
    await queryRunner.query(`DROP TABLE "subscription"`);
  }
}
