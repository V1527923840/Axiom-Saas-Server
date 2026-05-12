import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePlanMenuTable1747100000000 implements MigrationInterface {
  name = 'CreatePlanMenuTable1747100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "plan_menu" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "plan_id" uuid NOT NULL,
        "menu_id" uuid NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_plan_menu_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_plan_menu_plan_menu" UNIQUE ("plan_id", "menu_id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_plan_menu_plan_id" ON "plan_menu" ("plan_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_plan_menu_menu_id" ON "plan_menu" ("menu_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "plan_menu" ADD CONSTRAINT "FK_plan_menu_plan"
      FOREIGN KEY ("plan_id") REFERENCES "plan"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "plan_menu" ADD CONSTRAINT "FK_plan_menu_menu"
      FOREIGN KEY ("menu_id") REFERENCES "menu"("id") ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "plan_menu" DROP CONSTRAINT "FK_plan_menu_menu"`,
    );
    await queryRunner.query(
      `ALTER TABLE "plan_menu" DROP CONSTRAINT "FK_plan_menu_plan"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_plan_menu_menu_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_plan_menu_plan_id"`);
    await queryRunner.query(`DROP TABLE "plan_menu"`);
  }
}
