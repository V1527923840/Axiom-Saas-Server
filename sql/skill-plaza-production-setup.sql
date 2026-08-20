-- ============================================================
-- Skill Plaza — Production Setup (★ 2026-08-20)
-- ============================================================
-- 用途: 在生产 PostgreSQL 上一次性同步 Skill Plaza 模块的所有
--       schema + 菜单 + 角色分配。本文件等价于以下 3 个 TypeORM 迁移
--       的合并 up(),但用纯 SQL 写成,方便通过 psql 部署而不依赖
--       nest 进程:
--
--         1794000000000-CreateSkillTables.ts
--         1794000000001-AddSkillPlazaMenus.ts
--         1794000000002-AddSkillFileEntryName.ts
--
-- 幂等: 全部 CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS /
--       INSERT WHERE NOT EXISTS / ALTER TABLE ADD COLUMN IF NOT EXISTS,
--       重跑安全,适合 CI/CD 流水线与紧急回滚后重放。
--
-- 要求: PostgreSQL 15+ (用到了 NULLS NOT DISTINCT for uq_user_skill_binding)
-- 前置: plan / menu / role / ai_session 表必须已存在
--       (本项目其它迁移已创建)
-- 角色约定 (与 src/database/CLAUDE.md 的「迁移文件中的权限分配」一致):
--       roleId=1 = super_admin (bypass MenuAccessGuard)
--       roleId=2 = admin
--
-- 用法:
--   psql -h <host> -p <port> -U <user> -d <dbname> -f skill-plaza-production-setup.sql
-- 或在 psql 中:\i /path/to/skill-plaza-production-setup.sql
-- ============================================================

BEGIN;

-- ============================================================
-- 1) skill — Skill 主表(★ 2026-08-18 修订:unversioned)
-- ============================================================
-- 内容直接内联(无 skill_version / skill_tool 表);
-- upload/edit 幂等覆盖。
-- ============================================================
CREATE TABLE IF NOT EXISTS public.skill (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(64) NOT NULL,
  name varchar(128) NOT NULL,
  description text NOT NULL,
  category varchar(64),
  tags varchar(256)[],
  thumbnail_url text,
  uploader_type varchar(16) NOT NULL,
  uploader_id integer,
  marketplace_status varchar(16) NOT NULL DEFAULT 'private',
  signature varchar(256),
  status varchar(16) NOT NULL DEFAULT 'draft',
  -- ★ 内联版本化字段(替代原 skill_version 表)
  manifest_content text NOT NULL DEFAULT '',
  files_dir_path varchar(512) NOT NULL DEFAULT '',
  tools_dir_path varchar(512) NOT NULL DEFAULT '',
  manifest_token_estimate integer,
  total_token_estimate integer,
  content_hash varchar(64),
  changelog text,
  published_at timestamptz,
  created_by integer,
  -- ★ tool schema JSONB(替代原 skill_tool 表)
  tools jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT skill_marketplace_status_check CHECK (
    (marketplace_status)::text = ANY (
      (ARRAY['private','pending','listed'])::text[]
    )
  ),
  CONSTRAINT skill_status_check CHECK (
    (status)::text = ANY (
      (ARRAY['draft','published','archived'])::text[]
    )
  )
);

-- 软删除后允许 code 重用
CREATE UNIQUE INDEX IF NOT EXISTS uq_skill_code
  ON public.skill (code)
  WHERE (deleted_at IS NULL);

CREATE INDEX IF NOT EXISTS idx_skill_status
  ON public.skill (status)
  WHERE (deleted_at IS NULL);

CREATE INDEX IF NOT EXISTS idx_skill_marketplace
  ON public.skill (marketplace_status)
  WHERE (deleted_at IS NULL);

-- ============================================================
-- 2) skill_file — Skill 关联的文件清单
-- ============================================================
-- FK 指向 skill(id)(不是 skill_version.id,因 versioning 已删除)。
-- entry_name 是 2026-08-20 修订新增(FIX-6),记录 zip 内的完整
-- entry 名(含 files/ 前缀),getFileContent 按需提取时使用。
-- ============================================================
CREATE TABLE IF NOT EXISTS public.skill_file (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id uuid NOT NULL REFERENCES public.skill(id) ON DELETE CASCADE,
  relative_path varchar(512) NOT NULL,
  oss_path varchar(512) NOT NULL,
  entry_name varchar(512),  -- ★ 1794000000002:AddSkillFileEntryName
  description varchar(1024),
  size_bytes integer,
  content_hash varchar(64),
  token_estimate integer,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_skill_file
  ON public.skill_file (skill_id, relative_path);

CREATE INDEX IF NOT EXISTS idx_skill_file_skill
  ON public.skill_file (skill_id);

-- 单独 ALTER(幂等,覆盖已建表但缺 entry_name 的历史 DB)
ALTER TABLE public.skill_file
  ADD COLUMN IF NOT EXISTS entry_name varchar(512);

-- ============================================================
-- 3) user_skill_binding — 用户-Skill 绑定
-- ============================================================
-- source_ref_id 在 user_self 绑定时为 NULL,所以 unique 索引必须
-- NULLS NOT DISTINCT(PG 15+)才能正确去重。
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_skill_binding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id integer NOT NULL,
  skill_id uuid NOT NULL REFERENCES public.skill(id) ON DELETE CASCADE,
  source varchar(16) NOT NULL,
  source_ref_id uuid,
  status varchar(16) NOT NULL DEFAULT 'enabled',
  enabled_at timestamptz NOT NULL DEFAULT now(),
  enabled_by integer,
  CONSTRAINT usb_status_check CHECK (
    (status)::text = ANY ((ARRAY['enabled','disabled'])::text[])
  ),
  CONSTRAINT usb_source_check CHECK (
    (source)::text = ANY (
      (ARRAY['plan','admin_assigned','user_self'])::text[]
    )
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_skill_binding
  ON public.user_skill_binding (user_id, skill_id, source, source_ref_id)
  NULLS NOT DISTINCT;

CREATE INDEX IF NOT EXISTS idx_usb_user_enabled
  ON public.user_skill_binding (user_id)
  WHERE (status = 'enabled');

-- ============================================================
-- 4) session_skill_mount — 会话内挂载/卸载的 skill
-- ============================================================
-- 每条记录代表一次 mount 操作(添加或移除);
-- 当前 active 挂载 = (session_id, skill_id) 的最新 op='add'。
-- ============================================================
CREATE TABLE IF NOT EXISTS public.session_skill_mount (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.ai_session(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES public.skill(id) ON DELETE CASCADE,
  op varchar(8) NOT NULL DEFAULT 'add',
  source varchar(16) NOT NULL,
  mounted_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ssm_op_check CHECK (
    (op)::text = ANY ((ARRAY['add','remove'])::text[])
  ),
  CONSTRAINT ssm_source_check CHECK (
    (source)::text = ANY (
      (ARRAY['manual','auto_matched'])::text[]
    )
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_ssm
  ON public.session_skill_mount (session_id, skill_id);

CREATE INDEX IF NOT EXISTS idx_ssm_session
  ON public.session_skill_mount (session_id);

-- ============================================================
-- 5) plan_skill — 套餐-Skill 关联
-- ============================================================
-- plan_id 是 uuid(plan 表主键是 uuid,见 plan.id NOT NULL uuid_generate_v4)。
-- 一个套餐可包含多个 skill;upload/edit 时整组替换。
-- ============================================================
CREATE TABLE IF NOT EXISTS public.plan_skill (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.plan(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES public.skill(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_plan_skill
  ON public.plan_skill (plan_id, skill_id);

CREATE INDEX IF NOT EXISTS idx_plan_skill_skill
  ON public.plan_skill (skill_id);

-- ============================================================
-- 6) 菜单 — 应用广场 / skill广场 / skill管理
-- ============================================================
-- 排序阶梯: 核心 4 项 10/20/30/40,其他 50+,新增无法插队。
-- rationale: CLAUDE.md + 1794000000001-AddSkillPlazaMenus.ts §排序。
-- ============================================================

-- 6.1) 顶级菜单:应用广场 (parentId=NULL, sortOrder=40)
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
WHERE NOT EXISTS (SELECT 1 FROM menu WHERE code = 'app-plaza');

-- 6.2) 二级菜单:skill广场 (parent=app-plaza, sortOrder=1)
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
WHERE NOT EXISTS (SELECT 1 FROM menu WHERE code = 'skill-plaza');

-- 6.3) 二级菜单:skill管理 (parent=app-plaza, sortOrder=2)
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
WHERE NOT EXISTS (SELECT 1 FROM menu WHERE code = 'skill-plaza-admin');

-- ============================================================
-- 7) 角色分配 — Super Admin + Admin 都能看到 3 个菜单
-- ============================================================
-- roleId=1 (super_admin) bypass MenuAccessGuard,这里仍分配保持与
--    现有 seed 一致;
-- roleId=2 (admin) 必须显式 role_menu 行才能看到侧边栏。
-- ============================================================
INSERT INTO role_menu ("roleId", "menuId")
SELECT r.id, m.id
FROM role r
CROSS JOIN menu m
WHERE m.code IN ('app-plaza', 'skill-plaza', 'skill-plaza-admin')
  AND r.id IN (1, 2)
  AND NOT EXISTS (
    SELECT 1 FROM role_menu rm
    WHERE rm."roleId" = r.id AND rm."menuId" = m.id
  );

COMMIT;

-- ============================================================
-- 验证查询(可选,执行后人工检查)
-- ============================================================
-- 1) 5 张表都建好:
--   SELECT tablename FROM pg_tables WHERE schemaname = 'public'
--     AND (tablename LIKE 'skill%'
--          OR tablename IN ('user_skill_binding', 'session_skill_mount', 'plan_skill'))
--     ORDER BY tablename;
--  预期: plan_skill, session_skill_mount, skill, skill_file, user_skill_binding
--
-- 2) entry_name 列到位:
--   SELECT column_name FROM information_schema.columns
--     WHERE table_schema='public' AND table_name='skill_file' AND column_name='entry_name';
--  预期: 1 row
--
-- 3) 3 个菜单 + 6 行 role_menu:
--   SELECT code, name, path, "sortOrder" FROM menu
--     WHERE code IN ('app-plaza','skill-plaza','skill-plaza-admin') ORDER BY "sortOrder";
--   SELECT COUNT(*) FROM role_menu rm
--     JOIN menu m ON m.id = rm."menuId"
--     WHERE m.code IN ('app-plaza','skill-plaza','skill-plaza-admin');
--  预期: 3 rows / 6 rows
-- ============================================================
