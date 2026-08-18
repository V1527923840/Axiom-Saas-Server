import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add the Skill Plaza sidebar entries (★ 2026-08-18 修订 v4:系统菜单挪到底部).
 *
 * 排序阶梯(保证核心菜单稳定占位,未来新增无法插队):
 *   核心 4 项 (10/20/30/40 阶梯):overview → reports → content → app-plaza
 *   其他菜单:50+,并列按 code 字母排
 *   系统菜单:100,单独占位,永远在底部
 *
 * 层级:
 *   顶级同级:content(知识库, sortOrder=30) → app-plaza(应用广场, sortOrder=40, icon=LayoutGrid)
 *   app-plaza 之下:
 *     ├── skill-plaza (skill广场, /skills, sortOrder=1, icon=Wand2)
 *     └── skill-plaza-admin (skill管理, /skills/admin, sortOrder=2, icon=Wrench)
 *
 * Lives in a migration (not the menu seed) per
 * src/database/CLAUDE.md — the existing menu seed has an
 * `existingMenus > 0` early-return guard, so already-seeded DBs would
 * never pick these rows up. The migration is idempotent
 * (`WHERE NOT EXISTS`) so it is safe to re-run.
 *
 * Role assignment mirrors src/database/seeds/relational/menu/menu-seed.service.ts:
 *   1 = super_admin (assigned for completeness — bypasses MenuAccessGuard
 *       but seed assigns it too, so we keep parity)
 *   2 = admin       (the role that requires explicit role_menu rows to
 *                    see the sidebar entry)
 *
 * 等价于 sql/skill-plaza-setup.sql 的菜单段。两份必须保持 code 一致。
 */
export class AddSkillPlazaMenus1794000000001 implements MigrationInterface {
  name = 'AddSkillPlazaMenus1794000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) 顶级菜单:应用广场 (parentId=NULL, sortOrder=40, 在核心阶梯末位)
    //    icon = LayoutGrid (lucide-react 风格,与项目其他顶级菜单一致)
    //    ★ 阶梯策略:核心 4 项 10/20/30/40,其他 50+,新增无法插队
    await queryRunner.query(`
      INSERT INTO menu (id, name, code, icon, path, "parentId", "sortOrder", status, "createdAt", "updatedAt")
      SELECT
        gen_random_uuid(),
        '应用广场',
        'app-plaza',
        'LayoutGrid',
        '/apps',
        NULL,
        40,
        'active',
        NOW(),
        NOW()
      WHERE NOT EXISTS (SELECT 1 FROM menu WHERE code = 'app-plaza')
    `);

    // 2) 二级菜单:skill广场 (parent=app-plaza, icon=Wand2 魔法棒=施展技能)
    await queryRunner.query(`
      INSERT INTO menu (id, name, code, icon, path, "parentId", "sortOrder", status, "createdAt", "updatedAt")
      SELECT
        gen_random_uuid(),
        'skill广场',
        'skill-plaza',
        'Wand2',
        '/skills',
        (SELECT id FROM menu WHERE code = 'app-plaza' LIMIT 1),
        1,
        'active',
        NOW(),
        NOW()
      WHERE NOT EXISTS (SELECT 1 FROM menu WHERE code = 'skill-plaza')
    `);

    // 3) 二级菜单:skill管理 (parent=app-plaza)
    await queryRunner.query(`
      INSERT INTO menu (id, name, code, icon, path, "parentId", "sortOrder", status, "createdAt", "updatedAt")
      SELECT
        gen_random_uuid(),
        'skill管理',
        'skill-plaza-admin',
        'Wrench',
        '/skills/admin',
        (SELECT id FROM menu WHERE code = 'app-plaza' LIMIT 1),
        2,
        'active',
        NOW(),
        NOW()
      WHERE NOT EXISTS (SELECT 1 FROM menu WHERE code = 'skill-plaza-admin')
    `);

    // 4) 角色分配:Admin (roleId=2) + Super Admin (roleId=1) 都能访问 3 个菜单
    await queryRunner.query(`
      INSERT INTO role_menu ("roleId", "menuId")
      SELECT r.id, m.id
      FROM role r
      CROSS JOIN menu m
      WHERE m.code IN ('app-plaza', 'skill-plaza', 'skill-plaza-admin')
        AND r.id IN (1, 2)
        AND NOT EXISTS (
          SELECT 1 FROM role_menu rm
          WHERE rm."roleId" = r.id AND rm."menuId" = m.id
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM role_menu
      WHERE "menuId" IN (SELECT id FROM menu WHERE code IN ('app-plaza', 'skill-plaza', 'skill-plaza-admin'))
    `);
    await queryRunner.query(`
      DELETE FROM menu WHERE code IN ('app-plaza', 'skill-plaza', 'skill-plaza-admin')
    `);
  }
}
