import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Make the role table fully INSERT-able via the POST /v1/roles endpoint.
 *
 * Two pre-existing gaps were blocking role creation:
 *
 * 1. `role.id` had no DEFAULT and no sequence. Original create-table
 *    migration declared it as a plain `integer NOT NULL`, and the
 *    only rows in production came from seed scripts (RoleEnum.admin =
 *    1, RoleEnum.user = 2) that explicitly set the id. Any new insert
 *    that didn't supply an id hit a `NOT NULL violation on column
 *    "id"` — confirmed by the operator's failing curl on save.
 *
 * 2. `CreateRoleDto.code` was required, and RolesService.create
 *    writes `code` into the entity, but neither the entity nor the
 *    table had a `code` column. TypeORM silently drops unknown
 *    fields, so the insert "succeeded" with a meaningless id but the
 *    code the operator typed (or the frontend auto-generates) was
 *    thrown away.
 *
 * Both fixes are layered here so the change is atomic for whoever
 * runs `npm run migration:run`:
 *
 *   - Create a `role_id_seq` sequence owned by the column, prime it
 *     past the existing max so new rows never collide with seeded
 *     ids, then attach it as the column DEFAULT.
 *   - Add the `code` column nullable first, backfill legacy rows
 *     with a deterministic placeholder (`seeded_<lowercased name>`),
 *     enforce NOT NULL, and add a UNIQUE index so future DTO-driven
 *     inserts can't silently produce duplicates.
 *
 * The backfill is idempotent — running this migration twice still
 * produces a coherent table.
 */
export class AddRoleIdSequenceAndCode1790200000000
  implements MigrationInterface
{
  name = 'AddRoleIdSequenceAndCode1790200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // (1) Make role.id auto-generate via a dedicated sequence. We do
    // NOT change the column type — keep it `integer` (4 bytes) to
    // match what existing rows hold. Prime the sequence past the
    // current max(id) so a brand-new insert can't accidentally pick
    // an id that matches a seeded one.
    await queryRunner.query(
      `CREATE SEQUENCE IF NOT EXISTS "role_id_seq" OWNED BY "role"."id"`,
    );
    await queryRunner.query(
      `SELECT setval('"role_id_seq"', COALESCE((SELECT MAX("id") FROM "role"), 0))`,
    );
    await queryRunner.query(
      `ALTER TABLE "role" ALTER COLUMN "id" SET DEFAULT nextval('"role_id_seq"')`,
    );

    // (2) Add the `code` column. Two-step so legacy rows survive:
    //   - Nullable INSERT first.
    //   - Backfill with a deterministic slug so the column has data
    //     for every row before we tighten it.
    //   - Then NOT NULL + UNIQUE so future `CreateRoleDto.code`-only
    //     inserts (and the frontend's `role_<timestamp><rand>` slug)
    //     actually persist.
    await queryRunner.query(
      `ALTER TABLE "role" ADD COLUMN IF NOT EXISTS "code" varchar(50)`,
    );
    await queryRunner.query(
      `UPDATE "role" SET "code" = 'seeded_' || LOWER(REPLACE("name", ' ', '_')) WHERE "code" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "role" ALTER COLUMN "code" SET NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_role_code" ON "role" ("code")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse the two additions in the opposite order. We DROP the
    // column entirely instead of leaving it around in case some
    // future migration expects the original (id, name[, description])
    // shape.
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_role_code"`);
    await queryRunner.query(`ALTER TABLE "role" DROP COLUMN IF EXISTS "code"`);

    await queryRunner.query(
      `ALTER TABLE "role" ALTER COLUMN "id" DROP DEFAULT`,
    );
    await queryRunner.query(`DROP SEQUENCE IF EXISTS "role_id_seq"`);
  }
}
