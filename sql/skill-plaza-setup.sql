-- ============================================================
-- Skill Plaza — 5 表 standalone setup script
-- ============================================================
-- 用途: 直接在 192.168.1.3 的 PostgreSQL 上执行,无需走 TypeORM 迁移。
-- 等价于 src/database/migrations/1794000000000-CreateSkillTables.ts + 1794000000001-AddSkillPlazaMenus.ts 的合并 up()。
--
-- ★ 2026-08-18 修订: unversioned schema(无 skill_version / skill_tool 表)
-- ★ 关键约束:
--   - uq_skill_code partial WHERE deleted_at IS NULL(软删除后 code 可重用)
--   - uq_user_skill_binding NULLS NOT DISTINCT(PG 15+,手动绑定去重)
--   - plan_skill.plan_id 是 uuid(不是 integer)
--   - skill.tools 是 jsonb(替代原 skill_tool 表)
--   - skill_file.skill_id FK 改向 skill(不是 skill_version)
--   - session_skill_mount 没有 skill_version 列
--
-- 幂等:全部 IF NOT EXISTS,重跑安全。
-- 要求: PG 15+ (NULLS NOT DISTINCT)
-- 前置: plan 表 / menu 表 / role 表 / ai_session 表必须已存在
--       (本项目其它迁移已创建;若新建 DB,先按时间顺序跑完所有前置迁移)
--
-- 用法:
--   psql -h 192.168.1.3 -U postgres -d <dbname> -f skill-plaza-setup.sql
-- 或在 psql 中:
--   \i /path/to/skill-plaza-setup.sql
-- ============================================================

BEGIN;

-- ========== skill ==========
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
  -- ★ 新增:tool schema JSONB(替代原 skill_tool 表)
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

-- ========== skill_file ==========
CREATE TABLE IF NOT EXISTS public.skill_file (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id uuid NOT NULL REFERENCES public.skill(id) ON DELETE CASCADE,
  relative_path varchar(512) NOT NULL,
  oss_path varchar(512) NOT NULL,
  description varchar(1024),
  size_bytes integer,
  content_hash varchar(64),
  token_estimate integer,
  sort_order integer NOT NULL DEFAULT 0
);

-- ★ 修订:FK 改向 skill.id
CREATE UNIQUE INDEX IF NOT EXISTS uq_skill_file
  ON public.skill_file (skill_id, relative_path);

CREATE INDEX IF NOT EXISTS idx_skill_file_skill
  ON public.skill_file (skill_id);

-- ========== user_skill_binding ==========
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

-- ★ PG 15+ NULLS NOT DISTINCT:手动绑定去重才能正确
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_skill_binding
  ON public.user_skill_binding (user_id, skill_id, source, source_ref_id)
  NULLS NOT DISTINCT;

CREATE INDEX IF NOT EXISTS idx_usb_user_enabled
  ON public.user_skill_binding (user_id)
  WHERE (status = 'enabled');

-- ========== session_skill_mount ==========
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

-- ★ 修订:没有 skill_version 列,unique 索引只覆盖 (session_id, skill_id)
CREATE UNIQUE INDEX IF NOT EXISTS uq_ssm
  ON public.session_skill_mount (session_id, skill_id);

CREATE INDEX IF NOT EXISTS idx_ssm_session
  ON public.session_skill_mount (session_id);

-- ========== plan_skill ==========
CREATE TABLE IF NOT EXISTS public.plan_skill (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.plan(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES public.skill(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ★ plan.id 是 uuid(不是 integer,implementer 在 Task 3 抓到)
CREATE UNIQUE INDEX IF NOT EXISTS uq_plan_skill
  ON public.plan_skill (plan_id, skill_id);

CREATE INDEX IF NOT EXISTS idx_plan_skill_skill
  ON public.plan_skill (skill_id);

-- ========== 表注释 ==========
COMMENT ON TABLE public.skill IS 'Skill 广场 — 业务定义(★ unversioned,upload 幂等覆盖)';
COMMENT ON TABLE public.skill_file IS 'Skill 文件清单 — FK skill.id(★ 无版本)';
COMMENT ON TABLE public.user_skill_binding IS '用户-Skill 绑定 — source: plan|admin_assigned|user_self';
COMMENT ON TABLE public.session_skill_mount IS '会话-Skill 挂载 — op: add|remove,no skill_version';
COMMENT ON TABLE public.plan_skill IS '套餐-Skill 打包 — plan_id is uuid';
COMMENT ON COLUMN public.skill.tools IS '声明式 tool 列表 jsonb(替代原 skill_tool 表)';
COMMENT ON COLUMN public.skill.content_hash IS 'sha256(zip),用于幂等去重 + cache key';

-- ============================================================
-- 菜单 seed (★ 等价于 migration 1794000000001-AddSkillPlazaMenus.ts)
-- ============================================================
-- 层级(2026-08-18 修订 v4:系统菜单挪到底部):
--   核心 4 项 (10/20/30/40 阶梯):overview → reports → content → app-plaza
--   其他菜单 (50+):按 code 字母并列
--   系统菜单 (100):单独占位,永远在底部
--   app-plaza 之下:
--     ├── skill-plaza (skill广场, /skills, sortOrder=1, icon=Wand2)
--     └── skill-plaza-admin (skill管理, /skills/admin, sortOrder=2, icon=Wrench)
--
-- 阶梯策略的目的:核心菜单稳定占位 (10/20/30/40),未来新增菜单无法插队。
-- 新增非核心菜单请用 sortOrder=50+ (并列按 code);若必须插到核心层,
-- 用核心区间的尾数 (例如 35/45),不要用 5/15/25 之类。
-- 系统类菜单统一用 sortOrder=100+ (保持底部)。
--
-- 注:此段 INSERT 都带 WHERE NOT EXISTS,可幂等重跑。
-- 项目约定 (src/database/CLAUDE.md): 菜单在 Migration 中插入,不需要 Seed。

-- 1) 顶级菜单:应用广场 (parentId=NULL, sortOrder=40, 在核心阶梯的末位)
--    icon = LayoutGrid (lucide-react 风格,与项目其他顶级菜单一致)
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

-- 2) 二级菜单:skill广场 (parent=app-plaza, icon=Wand2 lucide 风格魔法棒=施展技能)
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

-- 3) 二级菜单:skill管理 (parent=app-plaza, icon=Wrench 扳手=管理工具)
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

-- 4) 角色分配:Admin (roleId=2) + Super Admin (roleId=1) 都能访问 3 个菜单
INSERT INTO role_menu ("roleId", "menuId")
SELECT r.id, m.id
FROM role r
CROSS JOIN menu m
WHERE m.code IN ('app-plaza', 'skill-plaza', 'skill-plaza-admin')
  AND r.id IN (1, 2)
ON CONFLICT DO NOTHING;

COMMIT;

-- ============================================================
-- 验证查询(可选,执行后人工检查)
-- ============================================================
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'skill%' OR tablename IN ('user_skill_binding', 'session_skill_mount', 'plan_skill') ORDER BY tablename;
--
-- 预期输出 5 张表:
--   plan_skill
--   session_skill_mount
--   skill
--   skill_file
--   user_skill_binding
--
-- SELECT indexname FROM pg_indexes WHERE tablename LIKE 'skill%' OR tablename IN ('user_skill_binding', 'session_skill_mount', 'plan_skill') ORDER BY indexname;
--
-- 预期输出:
--   idx_plan_skill_skill
--   idx_skill_file_skill
--   idx_skill_marketplace
--   idx_skill_status
--   idx_ssm_session
--   idx_usb_user_enabled
--   uq_plan_skill
--   uq_skill_code
--   uq_skill_file
--   uq_ssm
--   uq_user_skill_binding
-- ============================================================