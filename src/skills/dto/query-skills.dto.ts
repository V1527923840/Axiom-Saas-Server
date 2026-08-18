import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/**
 * Query DTO for GET /skills (cursor/page pagination).
 *
 * Per audit Task 25 plan (execution guide §2 — pending) the simple page
 * pagination from PaginationQueryDto is acceptable for now. Once cursor
 * pagination lands, swap out without touching the response envelope
 * (`infinityPagination` accepts both).
 */
export class QuerySkillsDto {
  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @ApiPropertyOptional({
    enum: ['draft', 'published', 'archived'],
    example: 'published',
  })
  @IsOptional()
  @IsIn(['draft', 'published', 'archived'])
  status?: 'draft' | 'published' | 'archived';

  @ApiPropertyOptional({ example: 'finance' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    enum: ['name', 'createdAt', 'updatedAt', 'publishedAt'],
    example: 'updatedAt',
  })
  @IsOptional()
  @IsIn(['name', 'createdAt', 'updatedAt', 'publishedAt'])
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'publishedAt';

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'], example: 'DESC' })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';
}
