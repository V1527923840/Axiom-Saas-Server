import { ApiProperty } from '@nestjs/swagger';

/**
 * Read-only projection of zsxq_posts — the Agent-pipeline source table
 * for ZSXQ (knowledge-star) intelligence posts. Only the fields used
 * by downstream services (currently DailySummaryService.getSources) are
 * mapped; the raw table carries many more columns that the SaaS side
 * never reads.
 */
export class ZsxqPost {
  @ApiProperty({ type: String, format: 'uuid' })
  id: string;

  @ApiProperty({ type: String, required: false, nullable: true })
  title?: string | null;

  @ApiProperty({ type: String, required: false, nullable: true })
  categoryL1?: string | null;

  @ApiProperty({ type: String, format: 'date' })
  postDate: Date;

  @ApiProperty({ type: String, required: false, nullable: true })
  sourceFileKey?: string | null;
}
