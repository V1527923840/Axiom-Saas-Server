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
 * Skill Plaza — PlanSkill entity.
 *
 * ★ plan_id 是 uuid(implementer 在 Task 3 抓到 plan.id 是 uuid,不是 integer)。
 * plan_skill 与 plan 多对一,与 skill 多对一。
 *
 * 字段映射:src/database/migrations/1794000000000-CreateSkillTables.ts
 */

@Entity({ name: 'plan_skill' })
@Index('uq_plan_skill', ['planId', 'skillId'], { unique: true })
@Index('idx_plan_skill_skill', ['skillId'])
export class PlanSkillEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'plan_id', type: 'uuid' })
  planId!: string;

  @Column({ name: 'skill_id', type: 'uuid' })
  skillId!: string;

  @ManyToOne(() => SkillEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'skill_id' })
  skill?: SkillEntity;

  @Column({ type: 'boolean', default: true })
  enabled!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
