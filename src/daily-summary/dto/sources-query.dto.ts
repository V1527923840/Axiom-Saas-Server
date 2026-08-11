import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * Query DTO for `GET /v1/daily-summary/:reportId/sources`.
 *
 * Why a hard cap (`@Max(200)`):
 *   `source_post_ids` / `source_research_ids` are unbounded jsonb arrays
 *   written by the Agent pipeline. Reports with 368+ sources have been
 *   observed. Letting clients request the full set would force the
 *   service to hydrate every id via two IN-batch queries and ship a
 *   multi-MB payload, and there is no client-side pagination today.
 *   200 covers the realistic drawer's first screen and is easy to bump
 *   if/when a paginated UI is added.
 *
 * Naming note:
 *   The response deliberately uses `postsTotal` / `researchTotal` (NOT
 *   `data` + `total` + `page` + `pageSize`) so that the global
 *   `TransformResponseInterceptor.isPaginated()` does not rewrite the
 *   envelope to `{ data, meta: { total, page, pageSize } }`.
 */
export class SourcesQueryDto {
  @ApiPropertyOptional({
    type: Number,
    minimum: 1,
    maximum: 200,
    default: 200,
    example: 200,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 200;

  @ApiPropertyOptional({
    type: Number,
    minimum: 0,
    default: 0,
    example: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}
