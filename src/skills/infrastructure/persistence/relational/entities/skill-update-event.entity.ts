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

export type SkillUpdateEventAction = 'update' | 'archive' | 'restore';
export type SkillUpdateEventActorRole = 'self' | 'admin' | 'super_admin';

@Entity({ name: 'skill_update_event' })
@Index('idx_skill_update_event_skill', ['skillId', 'createdAt'])
export class SkillUpdateEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'skill_id', type: 'uuid' })
  skillId!: string;

  @ManyToOne(() => SkillEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'skill_id' })
  skill?: SkillEntity;

  @Column({ name: 'actor_user_id', type: 'integer' })
  actorUserId!: number;

  @Column({ name: 'actor_role', type: 'varchar', length: 16 })
  actorRole!: SkillUpdateEventActorRole;

  @Column({ type: 'varchar', length: 16 })
  action!: SkillUpdateEventAction;

  @Column({ name: 'oss_key', type: 'varchar', length: 512, nullable: true })
  ossKey!: string | null;

  @Column({ name: 'old_hash', type: 'varchar', length: 64, nullable: true })
  oldHash!: string | null;

  @Column({ name: 'new_hash', type: 'varchar', length: 64, nullable: true })
  newHash!: string | null;

  @Column({ name: 'source_format', type: 'varchar', length: 8, nullable: true })
  sourceFormat!: 'md' | 'zip' | null;

  @Column({ type: 'text', nullable: true })
  changelog!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
