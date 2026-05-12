import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserMenuTable1747100001000 implements MigrationInterface {
  name = 'CreateUserMenuTable1747100001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "user_menu" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" int NOT NULL,
        "menu_id" uuid NOT NULL,
        "purchased_at" timestamptz NOT NULL DEFAULT now(),
        "expires_at" timestamptz NULL,
        CONSTRAINT "PK_user_menu_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_user_menu_user_menu" UNIQUE ("user_id", "menu_id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_user_menu_user_id" ON "user_menu" ("user_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_user_menu_menu_id" ON "user_menu" ("menu_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_user_menu_expires_at" ON "user_menu" ("expires_at")
    `);

    await queryRunner.query(`
      ALTER TABLE "user_menu" ADD CONSTRAINT "FK_user_menu_user"
      FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "user_menu" ADD CONSTRAINT "FK_user_menu_menu"
      FOREIGN KEY ("menu_id") REFERENCES "menu"("id") ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_menu" DROP CONSTRAINT "FK_user_menu_menu"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_menu" DROP CONSTRAINT "FK_user_menu_user"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_user_menu_expires_at"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_user_menu_menu_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_user_menu_user_id"`);
    await queryRunner.query(`DROP TABLE "user_menu"`);
  }
}
