import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePlansTable1747000000000 implements MigrationInterface {
  name = 'CreatePlansTable1747000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "plan" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "tier" character varying NOT NULL DEFAULT 'Lv0', "cycle" character varying NOT NULL, "pointsQuota" integer NOT NULL DEFAULT 0, "chatQuota" integer NOT NULL DEFAULT 0, "price" numeric(10,2) NOT NULL DEFAULT 0, "promotionalPrice" numeric(10,2), "description" text, "status" character varying NOT NULL DEFAULT 'active', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_96c930796b046f06b28e1175954" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_plans_tier" ON "plan" ("tier") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_plans_cycle" ON "plan" ("cycle") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_plans_status" ON "plan" ("status") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_plans_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_plans_cycle"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_plans_tier"`);
    await queryRunner.query(`DROP TABLE "plan"`);
  }
}
