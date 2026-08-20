-- ============================================================
-- Skill Plaza — Production Rollback (★ 2026-08-20)
-- ============================================================
-- 用途: 反向回滚 sql/skill-plaza-production-setup.sql 的全部内容。
--       即:
--         1794000000002-AddSkillFileEntryName (down)
--         1794000000001-AddSkillPlazaMenus    (down)
--         1794000000000-CreateSkillTables     (down)
--
-- 严格按 FK 依赖反序删除:
--   plan_skill  → user_skill_binding → session_skill_mount
--              → skill_file         → skill
--   THEN  menu(role_menu 必须先于 menu)
--
-- 警告: 本脚本会 DROP TABLE,所有用户上传的 skill 数据都将丢失。
--       生产环境执行前必须:
--         1) 备份: pg_dump -t skill -t skill_file -t user_skill_binding
--                                -t session_skill_mount -t plan_skill
--         2) 确认没有活跃用户在用 Skill Plaza
--         3) 通知所有 admin role 即将失去 app-plaza 菜单访问
--
-- 用法:
--   psql -h <host> -p <port> -U <user> -d <dbname> -f skill-plaza-production-rollback.sql
-- ============================================================

BEGIN;

-- ============================================================
-- Phase 1: 菜单 + 角色分配 (1794000000001 down)
-- ============================================================
-- 必须先删 role_menu(依赖 menu.id),再删 menu 本身。
-- ============================================================
DELETE FROM role_menu
WHERE "menuId" IN (
  SELECT id FROM menu
  WHERE code IN ('app-plaza', 'skill-plaza', 'skill-plaza-admin')
);

DELETE FROM menu
WHERE code IN ('app-plaza', 'skill-plaza', 'skill-plaza-admin');

-- ============================================================
-- Phase 2: 业务表 (1794000000000 down)
-- ============================================================
-- FK 拓扑:
--   plan_skill         → plan, skill
--   session_skill_mount → ai_session, skill
--   user_skill_binding → skill
--   skill_file         → skill
--   skill              ← (no FK in)
-- 删除顺序: 先删子表,再删 skill 本身。
-- ============================================================

DROP TABLE IF EXISTS public.plan_skill CASCADE;
DROP TABLE IF EXISTS public.session_skill_mount CASCADE;
DROP TABLE IF EXISTS public.user_skill_binding CASCADE;
DROP TABLE IF EXISTS public.skill_file CASCADE;
DROP TABLE IF EXISTS public.skill CASCADE;

-- Phase 2 note: 1794000000002 (entry_name) 已包含在 skill_file 的 DROP TABLE
-- 里,不需要单独 ALTER TABLE … DROP COLUMN。
-- 若升级路径是「setup → drop entry_name only」(不删整个表),改用:
--   ALTER TABLE public.skill_file DROP COLUMN IF EXISTS entry_name;

COMMIT;

-- ============================================================
-- 验证查询(可选,执行后人工检查)
-- ============================================================
-- 1) 5 张表都已删除:
--   SELECT tablename FROM pg_tables WHERE schemaname = 'public'
--     AND (tablename LIKE 'skill%'
--          OR tablename IN ('user_skill_binding', 'session_skill_mount', 'plan_skill'));
--  预期: 0 rows
--
-- 2) 3 个菜单已删除:
--   SELECT COUNT(*) FROM menu
--     WHERE code IN ('app-plaza','skill-plaza','skill-plaza-admin');
--  预期: 0
--
-- 3) role_menu 残留为 0 (上面 3 个菜单的):
--   SELECT COUNT(*) FROM role_menu rm
--     JOIN menu m ON m.id = rm."menuId"
--     WHERE m.code IN ('app-plaza','skill-plaza','skill-plaza-admin');
--  预期: 0
-- ============================================================
