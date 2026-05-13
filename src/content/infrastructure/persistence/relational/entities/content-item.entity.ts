import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';
import { ContentCategoryEntity } from './content-category.entity';

@Entity({ name: 'content_item' })
export class ContentItemEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'category_id' })
  categoryId: string;

  @ManyToOne(() => ContentCategoryEntity)
  @JoinColumn({ name: 'category_id' })
  category?: ContentCategoryEntity;

  @Index()
  @Column({ type: String, length: 500 })
  title: string;

  @Column({ type: String, length: 1000, nullable: true, name: 'summary' })
  summary?: string | null;

  @Column({ type: 'text', nullable: true, name: 'original_content' })
  originalContent?: string | null;

  @Column({
    type: String,
    length: 1000,
    nullable: true,
    name: 'source_file_url',
  })
  sourceFileUrl?: string | null;

  @Column({ type: String, length: 1000, nullable: true, name: 'json_file_url' })
  jsonFileUrl?: string | null;

  @Column({
    type: String,
    length: 1000,
    nullable: true,
    name: 'summary_file_url',
  })
  summaryFileUrl?: string | null;

  @Column({ type: 'jsonb', default: '[]' })
  images: string[];

  @Column({ type: String, length: 1000, nullable: true, name: 'audio_url' })
  audioUrl?: string | null;

  @Column({ type: 'text', nullable: true })
  transcript?: string | null;

  @Index()
  @Column({ type: 'timestamptz', nullable: true, name: 'published_at' })
  publishedAt?: Date | null;

  @Index()
  @Column({
    type: 'timestamptz',
    default: 'CURRENT_TIMESTAMP',
    name: 'collected_at',
  })
  collectedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Index()
  @Column({ type: String, length: 20, default: 'active' })
  status: string;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, any>;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt?: Date | null;

  // New fields for agent ingestion
  @Index()
  @Column({ type: String, length: 512, nullable: true, name: 'source_file' })
  sourceFile?: string | null;

  @Index()
  @Column({ type: String, length: 128, nullable: true })
  parser?: string | null;

  @Index()
  @Column({ type: 'date', nullable: true, name: 'report_date' })
  reportDate?: Date | null;

  @Index()
  @Column({ type: 'int', nullable: true, name: 'entry_index' })
  entryIndex?: number | null;

  @Index()
  @Column({ type: String, length: 128, nullable: true, name: 'entry_id' })
  entryId?: string | null;

  @Index()
  @Column({ type: 'timestamptz', nullable: true, name: 'content_timestamp' })
  contentTimestamp?: Date | null;

  @Column({ type: 'jsonb', default: '[]' })
  companies: Record<string, any>[];

  @Index()
  @Column({ type: String, length: 32, nullable: true })
  sentiment?: string | null;
}
