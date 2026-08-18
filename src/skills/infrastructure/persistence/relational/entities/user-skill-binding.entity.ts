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
 * Skill Plaza — UserSkillBinding entity.
 *
 * 用户-Skill 绑定。user_id 为 integer,source_ref_id 可空(用户自绑时无 ref)。
 * unique 索引在 migration 用 NULLS NOT DISTINCT(migration 唯一所有权)。
 *
 * 字段映射:src/database/migrations/1794000000000-CreateSkillTables.ts
 */

export type BindingSource = 'plan' | 'admin_assigned' | 'user_self';
export type BindingStatus = 'enabled' | 'disabled';

@Entity({ name: 'user_skill_binding' })
@Index(
  'uq_user_skill_binding',
  ['userId', 'skillId', 'source', 'sourceRefId'],
  { unique: true },
)
@Index('idx_usb_user_enabled', ['userId'], { where: "status = 'enabled'" })
export class UserSkillBindingEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'integer' })
  userId!: number;

  @Column({ name: 'skill_id', type: 'uuid' })
  skillId!: string;

  @ManyToOne(() => SkillEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'skill_id' })
  skill?: SkillEntity;

  @Column({ type: 'varchar', length: 16 })
  source!: BindingSource;

  @Column({ name: 'source_ref_id', type: 'uuid', nullable: true })
  sourceRefId!: string | null;

  @Column({ type: 'varchar', length: 16, default: 'enabled' })
  status!: BindingStatus;

  @CreateDateColumn({ name: 'enabled_at', type: 'timestamptz' })
  enabledAt!: Date;

  @Column({ name: 'enabled_by', type: 'integer', nullable: true })
  enabledBy!: number | null;
}
