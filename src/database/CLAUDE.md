# Database Migrations & Seeds 规范

## 核心原则

1. **新表创建** → 使用 Migration
2. **菜单/种子数据插入** → 使用 Migration（不用 Seed）
3. **仅在 Seed 中建表** → 当表属于外部系统（如 Agent 数据库）时

---

## Migration 命令

```bash
# 创建空白迁移
npm run migration:create -- src/database/migrations/MigrationName

# 运行迁移
npm run migration:run

# 回滚
npm run migration:revert
```

---

## 新增功能模块的数据库操作流程

### 场景 1: 新模块需要新建业务表 + 菜单

**步骤 1: 创建表结构的迁移**
```typescript
// src/database/migrations/{timestamp}-Create{Module}Table.ts
export class CreateModuleTable implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS module_name (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        -- 字段定义
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_module_field ON module_name(field)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS module_name`);
  }
}
```

**步骤 2: 创建菜单分配的迁移**
```typescript
// src/database/migrations/{timestamp}-Add{Module}Menus.ts
export class AddModuleMenus implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 插入菜单
    await queryRunner.query(`
      INSERT INTO menu (id, name, code, icon, path, "parentId", "sortOrder", status, "createdAt", "updatedAt")
      VALUES (
        gen_random_uuid()::uuid,
        '菜单名称',
        'menu-code',
        'IconName',
        '/menu-path',
        NULL,
        排序数字,
        'active',
        NOW(),
        NOW()
      )
    `);

    // 分配给 Admin 角色 (roleId = 2)
    await queryRunner.query(`
      INSERT INTO role_menu ("roleId", "menuId")
      SELECT 2, id FROM menu WHERE code = 'menu-code'
    `);

    // 如需分配给其他角色，重复 INSERT 语句
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM role_menu WHERE "menuId" IN (SELECT id FROM menu WHERE code = 'menu-code')`);
    await queryRunner.query(`DELETE FROM menu WHERE code = 'menu-code'`);
  }
}
```

**迁移文件命名规范:**
- 表结构迁移: `{timestamp}-Create{Module}Table.ts` (如 `1747600000000-CreateParseTaskTables.ts`)
- 菜单迁移: `{timestamp}-Add{Module}Menus.ts` (如 `1747500000000-AddParseTaskMenus.ts`)
- `{timestamp}` 使用 `Date.now()` 格式，确保唯一性

---

## 何时使用 Seed

| 场景 | Migration | Seed |
|------|-----------|------|
| 业务表创建 | ✅ | ❌ |
| 菜单插入 | ✅ | ❌ |
| 外部系统表（如 Agent 的 extraction_logs） | ❌ | ✅ |
| Seed-only 表需保留建表逻辑 | ❌ | ✅ |

---

## 已知的 Seed-Only 表

| 表名 | 位置 | 说明 |
|------|------|------|
| `scrape_log` | `scrape-log-seed.service.ts` | 建表 + 数据在 Seed 中完成 |

---

## 迁移文件中的权限分配

菜单迁移中分配给角色的规则:

| roleId | 角色 | 说明 |
|--------|------|------|
| 1 | Super Admin | 拥有所有权限 |
| 2 | Admin | 管理员 |

新菜单默认只分配给 Admin 角色。如需 Super Admin 也可访问，在迁移中加上：

```sql
INSERT INTO role_menu ("roleId", "menuId")
SELECT 1, id FROM menu WHERE code = 'menu-code'
```