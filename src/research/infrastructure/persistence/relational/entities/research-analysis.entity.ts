import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

@Entity({ name: 'research_analysis' })
export class ResearchAnalysisEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: String, length: 50 })
  version: string;

  @Index()
  @Column({ type: String, length: 255, name: 'document_name' })
  documentName: string;

  @Column({ type: String, length: 50, nullable: true, name: 'doc_type' })
  docType?: string | null;

  @Index()
  @Column({
    type: String,
    length: 500,
    nullable: true,
    name: 'source_file_key',
  })
  sourceFileKey?: string | null;

  @Column({ type: 'text', nullable: true, name: 'oss_url' })
  ossUrl?: string | null;

  @Column({ type: 'text', nullable: true, name: 'local_path' })
  localPath?: string | null;

  @Index()
  @Column({ type: String, length: 50, nullable: true, name: 'scrape_log_id' })
  scrapeLogId?: string | null;

  @Index()
  @Column({ type: 'timestamp', nullable: true, name: 'analyzed_at' })
  analyzedAt?: Date | null;

  @Index()
  @Column({ type: String, length: 50, nullable: true, name: 'category_l1' })
  categoryL1?: string | null;

  @Index()
  @Column({ type: String, length: 100, nullable: true, name: 'category_l2' })
  categoryL2?: string | null;

  @Column({ type: 'jsonb', nullable: true, name: 'sw_industry_tag' })
  swIndustryTag?: Record<string, any>[] | null;

  @Column({ type: 'jsonb', nullable: true, name: 'mentioned_stocks' })
  mentionedStocks?: Record<string, any>[] | null;

  @Column({ type: 'text', nullable: true, name: 'key_thesis' })
  keyThesis?: string | null;

  @Column({
    type: String,
    length: 20,
    nullable: true,
    name: 'analysis_version',
  })
  analysisVersion?: string | null;

  // ============================================================
  // Pyramid-view columns (replaces scoring + investment + content)
  // ============================================================
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
