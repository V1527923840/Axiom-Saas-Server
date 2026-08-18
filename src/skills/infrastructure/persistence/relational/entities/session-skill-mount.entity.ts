import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SkillEntity } from './skill.entity';

/**
 * Skill Plaza — SessionSkillMount entity (unversioned).
 *
 * ★ 2026-08-18 修订:无 skill_version 列。session 内 add/remove skill,
 * 只用 (session_id, skill_id) 唯一定位,unique 索引不包含 version。
 *
 * 字段映射:src/database/migrations/1794000000000-CreateSkillTables.ts
 */

export type MountOp = 'add' | 'remove';
export type MountSource = 'manual' | 'auto_matched';

@Entity({ name: 'session_skill_mount' })
@Index('uq_ssm', ['sessionId', 'skillId'], { unique: true })
@Index('idx_ssm_session', ['sessionId'])
export class SessionSkillMountEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'session_id', type: 'uuid' })
  sessionId!: string;

  @Column({ name: 'skill_id', type: 'uuid' })
  skillId!: string;

  @ManyToOne(() => SkillEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'skill_id' })
  skill?: SkillEntity;

  @Column({ type: 'varchar', length: 8, default: 'add' })
  op!: MountOp;

  @Column({ type: 'varchar', length: 16 })
  source!: MountSource;

  @CreateDateColumn({ name: 'mounted_at', type: 'timestamptz' })
  mountedAt!: Date;
}
