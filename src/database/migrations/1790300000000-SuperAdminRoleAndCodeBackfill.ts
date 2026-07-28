import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Pin the super admin role using `code='super_admin'`.
 *
 * Three steps, all idempotent so the migration can be re-run safely:
 *
 * (1) Bring `id=1` to a known super_admin state. If a row with `id=1`
 *     already exists, force its code/name/description to the canonical
 *     super admin values (a previous manual edit could have left them
 *     inconsistent). If it doesn't exist (fresh DB), insert it using
 *     an explicit id so subsequent seeds and tests can keep referencing
 *     `id=1` for the super admin.
 *
 * (2) Same for `id=2` → `code='admin'`, `name='Admin'`.
 *
 * (3) When neither `id=1` nor `id=2` exist yet (e.g. a fresh DB
 *     that never ran the legacy role-seed), the same `WHERE NOT EXISTS`
 *     guards in (1) and (2) fall through and run the explicit-id
 *     `INSERT` for `id=1` (super_admin) and `id=2` (admin). After
 *     those literal inserts, `setval('role_id_seq', GREATEST(MAX(id),
 *     1))` resyncs the sequence so future implicit-id inserts (e.g.
 *     `POST /v1/roles`) don't collide with id=1/id=2.
 *
 * The `down()` only reverts the name+code rename; it leaves rows
 * alone when nothing was changed, so re-running `down` then `up`
 * stays coherent.
 */
export class AddSuperAdminRoleAndCodeBackfill1790300000000 implements MigrationInterface {
  name = 'AddSuperAdminRoleAndCodeBackfill1790300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // (1) id=1 → super_admin (pin to canonical)
    // Defect 1: pre-clear any other row already holding code='super_admin'
    // (UQ_role_code would otherwise trip unique_violation on the UPDATE).
    await queryRunner.query(`
      UPDATE "role"
         SET "code" = "code" || '_legacy'
       WHERE "code" = 'super_admin'
         AND "id" <> 1
    `);
    await queryRunner.query(`
      UPDATE "role"
         SET "code" = 'super_admin',
             "name" = '超级管理员',
             "description" = '拥有全部菜单权限'
       WHERE "id" = 1
         AND ("code" IS NULL OR "code" <> 'super_admin')
    `);
    await queryRunner.query(`
      INSERT INTO "role" ("id", "name", "code", "description")
      SELECT 1, '超级管理员', 'super_admin', '拥有全部菜单权限'
       WHERE NOT EXISTS (SELECT 1 FROM "role" WHERE "id" = 1)
    `);

    // (2) id=2 → admin
    // Defect 1: same pre-clear pattern for code='admin'.
    await queryRunner.query(`
      UPDATE "role"
         SET "code" = "code" || '_legacy'
       WHERE "code" = 'admin'
         AND "id" <> 2
    `);
    await queryRunner.query(`
      UPDATE "role"
         SET "code" = 'admin',
             "name" = 'Admin',
             "description" = '管理员'
       WHERE "id" = 2
         AND ("code" IS NULL OR "code" <> 'admin')
    `);
    await queryRunner.query(`
      INSERT INTO "role" ("id", "name", "code", "description")
      SELECT 2, 'Admin', 'admin', '管理员'
       WHERE NOT EXISTS (SELECT 1 FROM "role" WHERE "id" = 2)
    `);

    // Defect 2: resync role_id_seq after the explicit-id fallbacks so future
    // INSERTs (e.g. POST /v1/roles) don't immediately collide with id=1/2.
    await queryRunner.query(`
      SELECT setval('"role_id_seq"', GREATEST((SELECT COALESCE(MAX("id"), 0) FROM "role"), 1))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert the rename only when our previous `up` wrote them.
    await queryRunner.query(`
      UPDATE "role"
         SET "name" = 'Admin', "code" = 'seeded_admin'
       WHERE "id" = 1 AND "code" = 'super_admin'
    `);
    await queryRunner.query(`
      UPDATE "role"
         SET "name" = 'User', "code" = 'seeded_user'
       WHERE "id" = 2 AND "code" = 'admin'
    `);
  }
}
