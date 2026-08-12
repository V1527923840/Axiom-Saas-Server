import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

/**
 * Daily Summary Brief (D10 V3 + V3.1) — SaaS 只读消费。
 *
 * 表由 Agent 侧管线写入，SaaS 端只读；因此本模块只提供查询能力，
 * 不提供 create/update/delete。列定义与迁移
 * `1791000000000-CreateDailySummaryTable` 一一对应（27 列 / 4 索引）。
 *
 * 索引名与迁移保持一致，避免 `migration:generate` 产生漂移。
 * 注意：迁移里 3 个索引带 `DESC` 排序，TypeORM 的 `@Index` 无法表达列级
 * 排序方向；由于 `DATABASE_SYNCHRONIZE=false`，这不影响运行时。
 *
 * `frequency` / `trigger_reason` 在 DB 层由 CHECK 约束枚举化，TS 侧刻意保持
 * `string`（plan §4.4），为将来新增频率值留出前向兼容空间。
 */
@Entity({ name: 'daily_summary' })
// 自然键（DB 层用 partial unique index 表达，见 1793000000000）：
//   frequency='daily'  → (report_date)  一天一份
//   frequency='weekly' → (week_start)   一周一份（时间窗口起点）
// 旧的 3 列复合 unique + 3 个 revision 索引在 1793000000000 一并清理。
@Index('idx_daily_summary_freq_date', ['frequency', 'reportDate'])
@Index('idx_daily_summary_last_data_check', ['lastDataCheckAt'])
export class DailySummaryEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid', { name: 'report_id' })
  reportId: string;

  /** 'daily' | 'weekly'（DB CHECK 约束保证） */
  @Column({ type: 'varchar', length: 16 })
  frequency: string;

  /** pg `date` 列 —— 驱动返回 'YYYY-MM-DD' 字符串，不做 Date 转换 */
  @Column({ type: 'date', name: 'report_date' })
  reportDate: string;

  @Column({ type: 'date', name: 'week_start', nullable: true })
  weekStart: string | null;

  @Column({ type: 'timestamptz', name: 'data_window_start' })
  dataWindowStart: Date;

  @Column({ type: 'timestamptz', name: 'data_window_end' })
  dataWindowEnd: Date;

  /**
   * daily: 4 段数组 (macro_overseas | industry | stock | risk)
   * weekly: 对象 `{ weekly_events: [...] }`（10-15 条事件）
   * 两种形态差异过大，刻意不收窄类型，由前端 section renderer 负责判别。
   */
  @Column({ type: 'jsonb' })
  sections: unknown;

  @Column({
    type: 'jsonb',
    name: 'source_post_ids',
    default: () => "'[]'::jsonb",
  })
  sourcePostIds: string[];

  @Column({
    type: 'jsonb',
    name: 'source_research_ids',
    default: () => "'[]'::jsonb",
  })
  sourceResearchIds: string[];

  @Column({ type: 'int', name: 'source_post_count', default: 0 })
  sourcePostCount: number;

  @Column({ type: 'int', name: 'source_research_count', default: 0 })
  sourceResearchCount: number;

  /** pg `numeric` —— 驱动返回字符串，避免精度丢失 */
  @Column({
    type: 'numeric',
    precision: 5,
    scale: 3,
    name: 'completeness_ratio',
    default: 1.0,
  })
  completenessRatio: string;

  @Column({ type: 'varchar', length: 64, name: 'trigger_reason' })
  triggerReason: string;

  @Column({ type: 'varchar', length: 64, name: 'build_prompt_version' })
  buildPromptVersion: string;

  @Column({ type: 'varchar', length: 64, name: 'build_model' })
  buildModel: string;

  @Column({ type: 'tstzrange', name: 'source_post_range', nullable: true })
  sourcePostRange: string | null;

  @Column({ type: 'boolean', name: 'has_topics', default: false })
  hasTopics: boolean;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  topics: unknown;

  @Column({ type: 'text', name: 'brief_summary_md', nullable: true })
  briefSummaryMd: string | null;

  @Column({
    type: 'timestamptz',
    name: 'generated_at',
    default: () => 'now()',
  })
  generatedAt: Date;

  @Column({
    type: 'timestamptz',
    name: 'last_data_check_at',
    default: () => 'now()',
  })
  lastDataCheckAt: Date;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  /** R1 completeness < 0.7 时为 TRUE（Task #20, 2026-08-11） */
  @Column({ type: 'boolean', name: 'has_data_warning', default: false })
  hasDataWarning: boolean;
}
