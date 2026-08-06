import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'ai_session' })
@Index('idx_ai_session_user_agent', ['userId', 'agentType', 'deletedAt'])
@Index('uq_ai_session_remote', ['userId', 'agentType', 'remoteSessionId'], {
  unique: true,
  where: '"remote_session_id" IS NOT NULL AND "deleted_at" IS NULL',
})
@Index('idx_ai_session_expires', ['expiresAt'], {
  where: '"deleted_at" IS NULL',
})
export class AiSessionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // FK to user.id (SERIAL/int). Stored as integer despite userId being typed
  // number | string in the domain — the actual database column is integer.
  @Column({ name: 'user_id', type: 'integer' })
  userId!: number | string;

  @Column({ name: 'agent_type', type: 'varchar', length: 64 })
  agentType!: string;

  @Column({
    name: 'remote_session_id',
    type: 'varchar',
    length: 128,
    nullable: true,
  })
  remoteSessionId!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  title!: string | null;

  @Column({ type: 'varchar', length: 32, default: 'active' })
  status!: string;

  @Column({ name: 'last_active_at', type: 'timestamptz' })
  lastActiveAt!: Date;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ name: 'quota_count', type: 'int', default: 0 })
  quotaCount!: number;

  @Column({ name: 'quota_date', type: 'date' })
  quotaDate!: Date;

  @Column({
    name: 'inflight_started_at',
    type: 'timestamptz',
    nullable: true,
  })
  inflightStartedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}
