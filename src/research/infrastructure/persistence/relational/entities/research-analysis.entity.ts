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

  @Column({ type: String, length: 50, nullable: true })
  version?: string | null;

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

  @Index()
  @Column({ type: String, length: 500, nullable: true, name: 'oss_url' })
  ossUrl?: string | null;

  @Column({ type: String, length: 500, nullable: true, name: 'local_path' })
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

  @Column({ type: 'jsonb', nullable: true, name: 'summary_points' })
  summaryPoints?: string[] | null;

  @Column({ type: 'jsonb', nullable: true, name: 'expectation_gap' })
  expectationGap?: Record<string, any> | null;

  // 6维度评分 (0-10)
  @Column({ type: 'int', nullable: true, name: 'source_credibility' })
  sourceCredibility?: number | null;

  @Column({ type: 'int', nullable: true, name: 'timeliness_score' })
  timelinessScore?: number | null;

  @Column({ type: 'int', nullable: true, name: 'data_density' })
  dataDensity?: number | null;

  @Column({ type: 'int', nullable: true, name: 'differentiation_score' })
  differentiationScore?: number | null;

  @Column({ type: 'int', nullable: true, name: 'actionability' })
  actionability?: number | null;

  @Column({ type: 'int', nullable: true, name: 'risk_disclosure' })
  riskDisclosure?: number | null;

  // 综合评分
  @Column({
    type: 'decimal',
    precision: 5,
    scale: 3,
    nullable: true,
    name: 'confidence_factor',
  })
  confidenceFactor?: number | null;

  @Index()
  @Column({ type: 'int', nullable: true, name: 'overall_score' })
  overallScore?: number | null;

  @Index()
  @Column({ type: String, length: 20, nullable: true, name: 'value_rating' })
  valueRating?: string | null;

  // 投资建议
  @Index()
  @Column({ type: String, length: 20, nullable: true })
  recommendation?: string | null;

  @Column({ type: String, length: 100, nullable: true, name: 'target_price' })
  targetPrice?: string | null;

  @Column({
    type: String,
    length: 20,
    nullable: true,
    name: 'investment_horizon',
  })
  investmentHorizon?: string | null;

  // 风险
  @Column({ type: 'jsonb', nullable: true, name: 'risks_warnings' })
  risksWarnings?: Record<string, any>[] | null;

  @Index()
  @Column({ type: String, length: 20, nullable: true, name: 'impact_level' })
  impactLevel?: string | null;

  @Column({ type: 'jsonb', nullable: true, name: 'affected_sectors' })
  affectedSectors?: Record<string, any>[] | null;

  @Index()
  @Column({
    type: String,
    length: 20,
    nullable: true,
    name: 'market_sentiment',
  })
  marketSentiment?: string | null;

  // 原文
  @Column({ type: 'text', nullable: true, name: 'original_text' })
  originalText?: string | null;

  @Column({ type: 'text', nullable: true, name: 'original_text_raw' })
  originalTextRaw?: string | null;

  @Column({
    type: String,
    length: 20,
    nullable: true,
    name: 'analysis_version',
  })
  analysisVersion?: string | null;

  // 时间戳
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
