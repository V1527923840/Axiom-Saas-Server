import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Skill Plaza — skill_update_event (★ 2026-08-22 spec §2.1).
 *
 * Append-only audit log for skill content updates + lifecycle changes.
 * No zip snapshots — events reference oss_key for future OSS GC scans.
 *
 * Idempotent (CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS).
 */
export class CreateSkillUpdateEventTable1794000000003 implements MigrationInterface {
  name = 'CreateSkillUpdateEventTable1794000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS skill_update_event (
        id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        skill_id        uuid NOT NULL REFERENCES skill(id) ON DELETE CASCADE,
        actor_user_id   integer NOT NULL,
        actor_role      varchar(16) NOT NULL,
        action          varchar(16) NOT NULL,
        oss_key         varchar(512),
        old_hash        varchar(64),
        new_hash        varchar(64),
        source_format   varchar(8),
        changelog       text,
        created_at      timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT skill_update_event_action_check CHECK (
          action IN ('update','archive','restore')
        ),
        CONSTRAINT skill_update_event_actor_role_check CHECK (
          actor_role IN ('self','admin','super_admin')
        )
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_skill_update_event_skill
        ON skill_update_event (skill_id, created_at DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS skill_update_event`);
  }
}
