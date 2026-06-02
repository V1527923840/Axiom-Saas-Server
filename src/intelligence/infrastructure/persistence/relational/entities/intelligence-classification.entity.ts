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

  @Column({ type: String, length: 200, nullable: true })
  author?: string | null;

  @Column({ type: String, length: 200, nullable: true, name: 'group_name' })
  groupName?: string | null;

  @Column({ type: 'int', default: 0, name: 'like_count' })
  likeCount: number;

  @Column({ type: 'int', default: 0, name: 'comment_count' })
  commentCount: number;

  // 6维度评分 (0-10)
  @Column({ type: 'smallint', nullable: true, name: 'source_credibility' })
  sourceCredibility?: number | null;

  @Column({ type: 'smallint', nullable: true, name: 'timeliness_score' })
  timelinessScore?: number | null;

  @Column({ type: 'smallint', nullable: true, name: 'data_density' })
  dataDensity?: number | null;

  @Column({ type: 'smallint', nullable: true, name: 'differentiation_score' })
  differentiationScore?: number | null;

  @Column({ type: 'smallint', nullable: true })
  actionability?: number | null;

  @Column({ type: 'smallint', nullable: true, name: 'risk_disclosure' })
  riskDisclosure?: number | null;

  // 综合评分
  @Column({
    type: 'decimal',
    precision: 3,
    scale: 2,
    nullable: true,
    name: 'confidence_factor',
  })
  confidenceFactor?: number | null;

  @Column({ type: 'smallint', nullable: true, name: 'total_score' })
  totalScore?: number | null;

  @Index()
  @Column({ type: String, length: 10, nullable: true, name: 'value_rating' })
  valueRating?: string | null;

  // JSONB字段
  @Column({ type: 'jsonb', nullable: true, name: 'sw_industry_tag' })
  swIndustryTag?: string[] | null;

  @Column({ type: 'jsonb', nullable: true, name: 'stock_mapping' })
  stockMapping?: { mentionedStocks?: { name: string }[] } | null;

  @Column({ type: 'jsonb', nullable: true, name: 'expectation_gap' })
  expectationGap?: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true, name: 'summary_points' })
  summaryPoints?: string[] | null;

  // 时间戳
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
