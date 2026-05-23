import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserRolesTable1747700000000 implements MigrationInterface {
  name = 'CreateUserRolesTable1747700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add description column to role table
    await queryRunner.query(`
      ALTER TABLE "role" ADD COLUMN "description" varchar(255)
    `);

    // Create user_roles table
    await queryRunner.query(`
      CREATE TABLE "user_roles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" int NOT NULL,
        "roleId" int NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_roles_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_user_roles_user_role" UNIQUE ("userId", "roleId")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_user_roles_user_id" ON "user_roles" ("userId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_user_roles_role_id" ON "user_roles" ("roleId")
    `);

    await queryRunner.query(`
      ALTER TABLE "user_roles" ADD CONSTRAINT "FK_user_roles_user"
      FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "user_roles" ADD CONSTRAINT "FK_user_roles_role"
      FOREIGN KEY ("roleId") REFERENCES "role"("id") ON DELETE CASCADE
    `);

    // Migrate existing user role data to user_roles table
    await queryRunner.query(`
      INSERT INTO "user_roles" ("userId", "roleId")
      SELECT "id", "roleId" FROM "user" WHERE "roleId" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_roles" DROP CONSTRAINT "FK_user_roles_role"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_roles" DROP CONSTRAINT "FK_user_roles_user"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_user_roles_role_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_user_roles_user_id"`);
    await queryRunner.query(`DROP TABLE "user_roles"`);
    await queryRunner.query(`ALTER TABLE "role" DROP COLUMN "description"`);
  }
}
