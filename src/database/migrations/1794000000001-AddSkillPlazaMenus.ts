import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add the Skill Plaza sidebar entry — one parent menu (`/skills`)
 * plus one admin child menu (`/skills/admin`).
 *
 * Lives in a migration (not the menu seed) per
 * src/database/CLAUDE.md — the existing menu seed has an
 * `existingMenus > 0` early-return guard, so already-seeded DBs would
 * never pick this row up. The migration is idempotent
 * (`WHERE NOT EXISTS`) so it is safe to re-run.
 *
 * Role assignment mirrors src/database/seeds/relational/menu/menu-seed.service.ts:
 *   1 = super_admin (assigned for completeness — bypasses MenuAccessGuard
 *       but seed assigns it too, so we keep parity)
 *   2 = admin       (the role that requires explicit role_menu rows to
 *                    see the sidebar entry)
 */
export class AddSkillPlazaMenus1794000000001 implements MigrationInterface {
  name = 'AddSkillPlazaMenus1794000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Parent: /skills (top-level sidebar entry visible to all roles
    // assigned below).
    await queryRunner.query(`
      INSERT INTO menu (id, name, code, icon, path, "parentId", "sortOrder", status, "createdAt", "updatedAt")
      SELECT
        gen_random_uuid(),
        'Skill 广场',
        'skill-plaza',
        'Sparkles',
        '/skills',
        NULL,
        5,
        'active',
        NOW(),
        NOW()
      WHERE NOT EXISTS (SELECT 1 FROM menu WHERE code = 'skill-plaza')
    `);

    // Child: /skills/admin — admin-only management page, nested under
    // the plaza entry.
    await queryRunner.query(`
      INSERT INTO menu (id, name, code, icon, path, "parentId", "sortOrder", status, "createdAt", "updatedAt")
      SELECT
        gen_random_uuid(),
        'Skill 管理',
        'skill-manage',
        'Wrench',
        '/skills/admin',
        (SELECT id FROM menu WHERE code = 'skill-plaza'),
        1,
        'active',
        NOW(),
        NOW()
      WHERE NOT EXISTS (SELECT 1 FROM menu WHERE code = 'skill-manage')
    `);

    // Assign /skills to super_admin (roleId = 1).
    await queryRunner.query(`
      INSERT INTO role_menu ("roleId", "menuId")
      SELECT 1, id FROM menu WHERE code = 'skill-plaza'
      AND NOT EXISTS (
        SELECT 1 FROM role_menu
        WHERE "roleId" = 1
          AND "menuId" = (SELECT id FROM menu WHERE code = 'skill-plaza')
      )
    `);

    // Assign /skills to admin (roleId = 2).
    await queryRunner.query(`
      INSERT INTO role_menu ("roleId", "menuId")
      SELECT 2, id FROM menu WHERE code = 'skill-plaza'
      AND NOT EXISTS (
        SELECT 1 FROM role_menu
        WHERE "roleId" = 2
          AND "menuId" = (SELECT id FROM menu WHERE code = 'skill-plaza')
      )
    `);

    // Assign /skills/admin to super_admin (roleId = 1).
    await queryRunner.query(`
      INSERT INTO role_menu ("roleId", "menuId")
      SELECT 1, id FROM menu WHERE code = 'skill-manage'
      AND NOT EXISTS (
        SELECT 1 FROM role_menu
        WHERE "roleId" = 1
          AND "menuId" = (SELECT id FROM menu WHERE code = 'skill-manage')
      )
    `);

    // Assign /skills/admin to admin (roleId = 2) — the brief's
    // primary requirement.
    await queryRunner.query(`
      INSERT INTO role_menu ("roleId", "menuId")
      SELECT 2, id FROM menu WHERE code = 'skill-manage'
      AND NOT EXISTS (
        SELECT 1 FROM role_menu
        WHERE "roleId" = 2
          AND "menuId" = (SELECT id FROM menu WHERE code = 'skill-manage')
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM role_menu
      WHERE "menuId" IN (SELECT id FROM menu WHERE code IN ('skill-plaza', 'skill-manage'))
    `);
    await queryRunner.query(`
      DELETE FROM menu WHERE code IN ('skill-plaza', 'skill-manage')
    `);
  }
}
