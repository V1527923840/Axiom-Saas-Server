import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SkillEntity } from './skill.entity';

/**
 * Skill Plaza — SkillFile entity (unversioned).
 *
 * ★ 2026-08-18 修订:FK 指向 skill.id(非 skill_version.id)。
 * 一个 skill 对应一组 file 记录;upload 幂等覆盖时整组替换。
 *
 * 字段映射:src/database/migrations/1794000000000-CreateSkillTables.ts
 */

@Entity({ name: 'skill_file' })
@Index('uq_skill_file', ['skillId', 'relativePath'], { unique: true })
@Index('idx_skill_file_skill', ['skillId'])
export class SkillFileEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'skill_id', type: 'uuid' })
  skillId!: string;

  @ManyToOne(() => SkillEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'skill_id' })
  skill?: SkillEntity;

  @Column({ name: 'relative_path', type: 'varchar', length: 512 })
  relativePath!: string;

  @Column({ name: 'oss_path', type: 'varchar', length: 512 })
  ossPath!: string;

  @Column({ type: 'varchar', length: 1024, nullable: true })
  description!: string | null;

  @Column({ name: 'size_bytes', type: 'integer', nullable: true })
  sizeBytes!: number | null;

  @Column({ name: 'content_hash', type: 'varchar', length: 64, nullable: true })
  contentHash!: string | null;

  @Column({ name: 'token_estimate', type: 'integer', nullable: true })
  tokenEstimate!: number | null;

  @Column({ name: 'sort_order', type: 'integer', default: 0 })
  sortOrder!: number;
}
