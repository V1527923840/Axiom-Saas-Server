import { ApiProperty } from '@nestjs/swagger';

/**
 * DailySummary 领域对象 —— 与 TypeORM entity 解耦的对外契约。
 *
 * 属性名/类型与 `Axiom-Saas-Web/src/services/daily-summary.ts` 的
 * `DailySummary` type 一一对应（plan Task 7），是 controller 响应的 JSON 形态。
 *
 * 注意：`sourcePostRange`、`createdAt`、`updatedAt` 属于持久化细节，
 * 前端契约里不存在，故不出现在领域对象上。
 */
export class DailySummary {
  @ApiProperty({
    type: String,
    example: 'cbcfa8b8-3a25-4adb-a9c6-e325f0d0f3ae',
  })
  reportId: string;

  @ApiProperty({ type: String, example: 'daily' })
  frequency: string;

  @ApiProperty({ type: String, example: '2026-08-11' })
  reportDate: string;

  @ApiProperty({
    type: String,
    example: '2026-08-10',
    required: false,
    nullable: true,
  })
  weekStart: string | null;

  @ApiProperty({ example: '2026-08-10T16:00:00.000Z' })
  dataWindowStart: Date;

  @ApiProperty({ example: '2026-08-11T16:00:00.000Z' })
  dataWindowEnd: Date;

  @ApiProperty({
    description:
      'daily: 4 段数组 (macro_overseas|industry|stock|risk); weekly: { weekly_events: [...] }',
    example: [{ section: 'macro_overseas', items: [] }],
  })
  sections: unknown;

  @ApiProperty({
    type: [String],
    example: ['cbcfa8b8-3a25-4adb-a9c6-e325f0d0f3ae'],
  })
  sourcePostIds: string[];

  @ApiProperty({
    type: [String],
    example: ['3a25cbcf-a8b8-4adb-a9c6-e325f0d0f3ae'],
  })
  sourceResearchIds: string[];

  @ApiProperty({ type: Number, example: 42 })
  sourcePostCount: number;

  @ApiProperty({ type: Number, example: 7 })
  sourceResearchCount: number;

  /** pg numeric(5,3) —— 以字符串传递，避免浮点精度丢失 */
  @ApiProperty({ type: String, example: '1.000' })
  completenessRatio: string;

  @ApiProperty({ type: Boolean, example: false })
  hasDataWarning: boolean;

  @ApiProperty({ type: String, example: 'scheduled' })
  triggerReason: string;

  @ApiProperty({ type: String, example: 'v3.1' })
  buildPromptVersion: string;

  @ApiProperty({ type: String, example: 'gpt-4o' })
  buildModel: string;

  @ApiProperty({ type: Boolean, example: false })
  hasTopics: boolean;

  @ApiProperty({ example: [] })
  topics: unknown;

  @ApiProperty({
    type: String,
    example: '## 今日要点\n- ...',
    required: false,
    nullable: true,
  })
  briefSummaryMd: string | null;

  @ApiProperty({ example: '2026-08-11T16:05:00.000Z' })
  generatedAt: Date;

  @ApiProperty({ example: '2026-08-11T16:05:00.000Z' })
  lastDataCheckAt: Date;
}
