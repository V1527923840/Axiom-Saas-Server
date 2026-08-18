import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Skill Plaza — unversioned Skill entity.
 *
 * ★ 2026-08-18 修订:删除 versioning。一个 skill = 一份当前内容,
 * upload/edit 幂等覆盖。Manifest/files/tools 字段直接内联到本表,
 * 不再有 skill_version / skill_tool 表。
 *
 * 字段映射:src/database/migrations/1794000000000-CreateSkillTables.ts
 */

export type SkillStatus = 'draft' | 'published' | 'archived';

export type UploaderType = 'platform' | 'user_self' | 'third_party';

export type MarketplaceStatus = 'private' | 'pending' | 'listed';

export interface SkillToolSchema {
  name: string;
  description?: string;
  parameters?: Record<string, unknown>;
  [key: string]: unknown;
}

@Entity({ name: 'skill' })
@Index('uq_skill_code', ['code'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
@Index('idx_skill_status', ['status'], { where: '"deleted_at" IS NULL' })
@Index('idx_skill_marketplace', ['marketplaceStatus'], {
  where: '"deleted_at" IS NULL',
})
export class SkillEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 64 })
  code!: string;

  @Column({ type: 'varchar', length: 128 })
  name!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  category!: string | null;

  @Column({ type: 'varchar', length: 256, nullable: true, array: true })
  tags!: string[] | null;

  @Column({ name: 'thumbnail_url', type: 'text', nullable: true })
  thumbnailUrl!: string | null;

  @Column({ name: 'uploader_type', type: 'varchar', length: 16 })
  uploaderType!: UploaderType;

  @Column({ name: 'uploader_id', type: 'integer', nullable: true })
  uploaderId!: number | null;

  @Column({
    name: 'marketplace_status',
    type: 'varchar',
    length: 16,
    default: 'private',
  })
  marketplaceStatus!: MarketplaceStatus;

  @Column({ type: 'varchar', length: 256, nullable: true })
  signature!: string | null;

  @Column({ type: 'varchar', length: 16, default: 'draft' })
  status!: SkillStatus;

  // ★ unversioned:inline manifest/files/tools(原 skill_version 表的列)
  @Column({ name: 'manifest_content', type: 'text', default: '' })
  manifestContent!: string;

  @Column({ name: 'files_dir_path', type: 'varchar', length: 512, default: '' })
  filesDirPath!: string;

  @Column({ name: 'tools_dir_path', type: 'varchar', length: 512, default: '' })
  toolsDirPath!: string;

  @Column({
    name: 'manifest_token_estimate',
    type: 'integer',
    nullable: true,
  })
  manifestTokenEstimate!: number | null;

  @Column({ name: 'total_token_estimate', type: 'integer', nullable: true })
  totalTokenEstimate!: number | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  contentHash!: string | null;

  @Column({ type: 'text', nullable: true })
  changelog!: string | null;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt!: Date | null;

  @Column({ name: 'created_by', type: 'integer', nullable: true })
  createdBy!: number | null;

  // ★ 新增:声明式 tool 列表(替代原 skill_tool 表)
  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  tools!: SkillToolSchema[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}
