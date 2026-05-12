import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMenuTables1747000004000 implements MigrationInterface {
  name = 'CreateMenuTables1747000004000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create menu table
    await queryRunner.query(`
      CREATE TABLE "menu" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" varchar(100) NOT NULL,
        "code" varchar(50) NOT NULL,
        "icon" varchar(50),
        "path" varchar(255) NOT NULL,
        "parentId" uuid,
        "sortOrder" int NOT NULL DEFAULT 0,
        "status" varchar(20) NOT NULL DEFAULT 'active',
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_menu_code" UNIQUE ("code"),
        CONSTRAINT "PK_menu_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_menu_parent_id" ON "menu" ("parentId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_menu_status" ON "menu" ("status")
    `);

    await queryRunner.query(`
      ALTER TABLE "menu" ADD CONSTRAINT "FK_menu_parent"
      FOREIGN KEY ("parentId") REFERENCES "menu"("id") ON DELETE SET NULL
    `);

    // Create role_menu table
    await queryRunner.query(`
      CREATE TABLE "role_menu" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "roleId" int NOT NULL,
        "menuId" uuid NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_role_menu_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_role_menu_role_menu" UNIQUE ("roleId", "menuId")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_role_menu_role_id" ON "role_menu" ("roleId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_role_menu_menu_id" ON "role_menu" ("menuId")
    `);

    await queryRunner.query(`
      ALTER TABLE "role_menu" ADD CONSTRAINT "FK_role_menu_role"
      FOREIGN KEY ("roleId") REFERENCES "role"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "role_menu" ADD CONSTRAINT "FK_role_menu_menu"
      FOREIGN KEY ("menuId") REFERENCES "menu"("id") ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "role_menu" DROP CONSTRAINT "FK_role_menu_menu"`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_menu" DROP CONSTRAINT "FK_role_menu_role"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_role_menu_menu_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_role_menu_role_id"`);
    await queryRunner.query(`DROP TABLE "role_menu"`);
    await queryRunner.query(
      `ALTER TABLE "menu" DROP CONSTRAINT "FK_menu_parent"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_menu_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_menu_parent_id"`);
    await queryRunner.query(`DROP TABLE "menu"`);
  }
}
