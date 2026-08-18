import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Skill Plaza — unversioned schema (★ 2026-08-18 修订:删除 versioning).
 *
 * 决策:一个 skill = 一份当前内容,upload 直接覆盖,upload/edit 幂等。
 * 因此:
 *   - 没有 skill_version / skill_tool 表
 *   - skill 表内联原 version 表的 manifest/files/tools 字段
 *   - skill_file FK 改向 skill.id(不是 skill_version.id)
 *   - session_skill_mount 没有 skill_version 列
 *
 * Idempotent:全部 CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS,
 * 在已有表上重跑安全。
 */
export class CreateSkillTables1794000000000 implements MigrationInterface {
  name = 'CreateSkillTables1794000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ========== skill ==========
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS skill (
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
      )
    `);

    // 软删除后允许 code 重用
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_skill_code
        ON public.skill (code)
        WHERE (deleted_at IS NULL)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_skill_status
        ON public.skill (status)
        WHERE (deleted_at IS NULL)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_skill_marketplace
        ON public.skill (marketplace_status)
        WHERE (deleted_at IS NULL)
    `);

    // ========== skill_file ==========
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS skill_file (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        skill_id uuid NOT NULL REFERENCES skill(id) ON DELETE CASCADE,
        relative_path varchar(512) NOT NULL,
        oss_path varchar(512) NOT NULL,
        description varchar(1024),
        size_bytes integer,
        content_hash varchar(64),
        token_estimate integer,
        sort_order integer NOT NULL DEFAULT 0
      )
    `);

    // ★ 修订:FK 改向 skill.id(skill_version 删除后)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_skill_file
        ON public.skill_file (skill_id, relative_path)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_skill_file_skill
        ON public.skill_file (skill_id)
    `);

    // ========== user_skill_binding ==========
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_skill_binding (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id integer NOT NULL,
        skill_id uuid NOT NULL REFERENCES skill(id) ON DELETE CASCADE,
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
      )
    `);

    // ★ PG 15+ NULLS NOT DISTINCT:手动绑定去重才能正确
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_user_skill_binding
        ON public.user_skill_binding (user_id, skill_id, source, source_ref_id)
        NULLS NOT DISTINCT
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_usb_user_enabled
        ON public.user_skill_binding (user_id)
        WHERE (status = 'enabled')
    `);

    // ========== session_skill_mount ==========
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS session_skill_mount (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id uuid NOT NULL REFERENCES ai_session(id) ON DELETE CASCADE,
        skill_id uuid NOT NULL REFERENCES skill(id) ON DELETE CASCADE,
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
      )
    `);

    // ★ 修订:没有 skill_version 列,unique 索引只覆盖 (session_id, skill_id)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_ssm
        ON public.session_skill_mount (session_id, skill_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ssm_session
        ON public.session_skill_mount (session_id)
    `);

    // ========== plan_skill ==========
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS plan_skill (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        plan_id uuid NOT NULL REFERENCES plan(id) ON DELETE CASCADE,
        skill_id uuid NOT NULL REFERENCES skill(id) ON DELETE CASCADE,
        enabled boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    // ★ plan.id 是 uuid(不是 integer,implementer 在 Task 3 抓到)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_plan_skill
        ON public.plan_skill (plan_id, skill_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_plan_skill_skill
        ON public.plan_skill (skill_id)
    `);

    // 表注释
    await queryRunner.query(`
      COMMENT ON TABLE skill IS 'Skill 广场 — 业务定义(★ unversioned,upload 幂等覆盖)'
    `);
    await queryRunner.query(`
      COMMENT ON TABLE skill_file IS 'Skill 文件清单 — FK skill.id(★ 无版本)'
    `);
    await queryRunner.query(`
      COMMENT ON TABLE user_skill_binding IS '用户-Skill 绑定 — source: plan|admin_assigned|user_self'
    `);
    await queryRunner.query(`
      COMMENT ON TABLE session_skill_mount IS '会话-Skill 挂载 — op: add|remove,no skill_version'
    `);
    await queryRunner.query(`
      COMMENT ON TABLE plan_skill IS '套餐-Skill 打包 — plan_id is uuid'
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN skill.tools IS '声明式 tool 列表 jsonb(替代原 skill_tool 表)'
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN skill.content_hash IS 'sha256(zip),用于幂等去重 + cache key'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 顺序反向,先 drop 有 FK 的
    await queryRunner.query(`DROP TABLE IF EXISTS plan_skill`);
    await queryRunner.query(`DROP TABLE IF EXISTS session_skill_mount`);
    await queryRunner.query(`DROP TABLE IF EXISTS user_skill_binding`);
    await queryRunner.query(`DROP TABLE IF EXISTS skill_file`);
    await queryRunner.query(`DROP TABLE IF EXISTS skill`);
  }
}
