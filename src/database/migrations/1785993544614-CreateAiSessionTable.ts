import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAiSessionTable1785993544614 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "ai_session" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" integer NOT NULL,
        "agent_type" varchar(64) NOT NULL,
        "remote_session_id" varchar(128),
        "title" varchar(255),
        "status" varchar(32) NOT NULL DEFAULT 'active',
        "last_active_at" timestamptz NOT NULL DEFAULT now(),
        "expires_at" timestamptz NOT NULL DEFAULT (now() + INTERVAL '30 days'),
        "quota_count" int NOT NULL DEFAULT 0,
        "quota_date" date NOT NULL DEFAULT CURRENT_DATE,
        "inflight_started_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        CONSTRAINT "pk_ai_session" PRIMARY KEY ("id"),
        CONSTRAINT "fk_ai_session_user"
          FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_ai_session_user_agent"
        ON "ai_session" ("user_id", "agent_type", "deleted_at")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_ai_session_remote"
        ON "ai_session" ("user_id", "agent_type", "remote_session_id")
        WHERE "remote_session_id" IS NOT NULL AND "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_ai_session_expires"
        ON "ai_session" ("expires_at")
        WHERE "deleted_at" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "ai_session"`);
  }
}
