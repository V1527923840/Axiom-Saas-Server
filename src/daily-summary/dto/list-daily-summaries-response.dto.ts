import { ApiProperty } from '@nestjs/swagger';
import { DailySummary } from '../domain/daily-summary';

/**
 * 注意：全局 `TransformResponseInterceptor` 会把本形状改写成
 * `{ data, meta: { total, page, pageSize } }` 再上线缆。
 * 本 DTO 描述的是 **controller 返回值**，仅用于 `@nestjs/swagger`
 * 生成 schema 与 web `api:generate` 出类型。
 * 前端实际消费的信封形状见 web `services/daily-summary.ts` 的
 * `listDailySummaries()` —— 它读 `response.data` / `response.meta.*`。
 */
export class ListDailySummariesResponseDto {
  @ApiProperty({ type: [DailySummary] })
  data!: DailySummary[];

  @ApiProperty({ type: Number, example: 42 })
  total!: number;

  @ApiProperty({ type: Number, example: 0, description: '0-based' })
  page!: number;

  @ApiProperty({ type: Number, example: 20 })
  pageSize!: number;
}
