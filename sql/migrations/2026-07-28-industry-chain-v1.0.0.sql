-- =============================================================================
-- 产业链 (Industry Chain) 模块 v1.0.0 — 远端部署脚本
-- =============================================================================
-- 适用: 把这个模块的菜单/权限 推到远端 PostgreSQL
-- 不含: 8 条 industry_chain_qiniu_registry 数据记录（内容数据，应由内容生产流水线写入）
-- 不含: 源代码（git tag `industry-chain-v1.0.0` 已含全部代码）
-- 前置: 1) 应用已部署, 2) 菜单迁移 `AddMenus.ts` 已跑, 3) 已有 `code='content'` 的菜单
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1) 菜单项: 产业链（挂到 内容管理 下，sortOrder=4）
-- -----------------------------------------------------------------------------
INSERT INTO menu (id, name, code, icon, path, "parentId", "sortOrder", status, "createdAt", "updatedAt")
SELECT
  gen_random_uuid(),
  '产业链',
  'industry-chains',
  'Factory',
  '/content/industry-chains',
  (SELECT id FROM menu WHERE code = 'content'),
  4,
  'active',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM menu WHERE code = 'industry-chains');

-- -----------------------------------------------------------------------------
-- 2) 把菜单分配给 Admin 角色 (roleId = 2)
-- -----------------------------------------------------------------------------
INSERT INTO role_menu (id, "roleId", "menuId", "createdAt")
SELECT
  gen_random_uuid(),
  2,
  m.id,
  NOW()
FROM menu m
WHERE m.code = 'industry-chains'
  AND NOT EXISTS (
    SELECT 1 FROM role_menu
    WHERE "roleId" = 2 AND "menuId" = m.id
  );

COMMIT;

-- =============================================================================
-- 验证
-- =============================================================================
-- SELECT m.name, m.code, m.path, m."sortOrder", p.code AS parent
--   FROM menu m LEFT JOIN menu p ON m."parentId" = p.id
--   WHERE m.code = 'industry-chains';
-- 预期: name='产业链', code='industry-chains', path='/content/industry-chains',
--       sortOrder=4, parent='content'
--
-- SELECT rm."roleId", m.code
--   FROM role_menu rm JOIN menu m ON rm."menuId" = m.id
--   WHERE m.code = 'industry-chains';
-- 预期: 1 行，roleId=2
-- =============================================================================
