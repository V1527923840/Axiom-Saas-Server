import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

@Entity({ name: 'zsxq_posts' })
export class IntelligenceClassificationEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'scrape_log_id', nullable: true })
  scrapeLogId?: string | null;

  @Index()
  @Column({ type: String, length: 500, name: 'source_file_key' })
  sourceFileKey: string;

  @Column({ type: String, length: 50 })
  version: string;

  @Index()
  @Column({ type: 'date', name: 'post_date' })
  postDate: Date;

  @Index()
  @Column({ type: String, length: 100, name: 'category_l1' })
  categoryL1: string;

  @Index()
  @Column({ type: String, length: 100, name: 'category_l2' })
  categoryL2: string;

  @Column({ type: 'text', nullable: true })
  summary?: string | null;

  @Column({ type: 'text', nullable: true })
  title?: string | null;

  @Column({ type: 'text', name: 'original_text' })
  originalText: string;

  @Column({ type: 'text', name: 'original_text_raw', nullable: true })
  originalTextRaw?: string | null;

  @Column({
    type: 'jsonb',
    name: 'image_urls',
    nullable: true,
    default: () => "'[]'::jsonb",
  })
  imageUrls?: string[] | null;

  @Column({ type: String, length: 200, nullable: true })
  author?: string | null;

  @Column({ type: String, length: 200, nullable: true, name: 'group_name' })
  groupName?: string | null;

  @Column({ type: 'jsonb', nullable: true, name: 'sw_industry_tag' })
  swIndustryTag?: string[] | null;

  @Column({ type: 'jsonb', nullable: true, name: 'stock_mapping' })
  stockMapping?: { mentionedStocks?: { name: string }[] } | null;

  @Column({ type: 'jsonb', nullable: true, name: 'expectation_gap' })
  expectationGap?: Record<string, any> | null;

  // ============================================================
  // Pyramid-view columns (replaces 6-dimension scoring)
  // ============================================================
  @Column({
    type: String,
    length: 20,
    nullable: true,
    name: 'classification_method',
    default: () => "'llm'",
  })
  classificationMethod?: string | null;

  @Column({ type: 'jsonb', nullable: true, name: 'raw_facts' })
  rawFacts?: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true, name: 'induction_groups' })
  inductionGroups?: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true, name: 'base_view' })
  baseView?: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true, name: 'mid_view' })
  midView?: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true, name: 'core_view' })
  coreView?: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true, name: 'pyramid_judgement' })
  pyramidJudgement?: Record<string, any> | null;

  @Column({
    type: String,
    length: 10,
    nullable: true,
    name: 'pyramid_version',
    default: () => "'v2.0'",
  })
  pyramidVersion?: string | null;

  // ============================================================
  // Timestamps
  // ============================================================
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
