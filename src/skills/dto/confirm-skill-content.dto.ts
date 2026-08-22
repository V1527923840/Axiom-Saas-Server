import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
} from 'class-validator';

/**
 * Phase 2: idempotent overwrite of a skill's content.
 *
 * Per audit C-1 (decision in Task 15 brief) this is the payload for
 * PUT /skills/{id}/content — matching the spec's intent of an idempotent
 * "version-like" update while honoring the no-versioning decision.
 *
 * Note: skillId is in the URL path, not the body, for RESTful consistency.
 */
export class ConfirmSkillContentDto {
  @ApiProperty({ example: 'skills/{skillId}/{hash}.zip' })
  @IsString()
  ossKey!: string;

  @ApiProperty({ example: 'a'.repeat(64) })
  @IsString()
  @Length(64, 64)
  hash!: string;

  @ApiProperty({ enum: ['md', 'zip'], example: 'zip' })
  @IsIn(['md', 'zip'])
  sourceFormat!: 'md' | 'zip';

  // ★ code 现在由后端从前端传入的 name 自动生成(slugify + 短 hash fallback)
  // — UI 隐藏此字段;为了向后兼容老的客户端仍允许显式传入。
  @ApiPropertyOptional({
    example: 'principles-skill',
    maxLength: 64,
    description:
      'Optional override. When omitted, the backend derives code from `name` (slug + hash fallback).',
  })
  @IsOptional()
  @IsString()
  @Length(1, 64)
  code?: string;

  @ApiProperty({ example: 'Trading Principles', maxLength: 128 })
  @IsString()
  @Length(1, 128)
  name!: string;

  // ★ changelog 字段已从前端 UI 移除;DTO 保留可选以兼容未来手动调用。
  // 当前前端永远不传,后端会用 "Initial publish" 占位。

  // ★ description 可选 + fallback:如果 DTO 收到的 description 太短(< 10)
  // 或缺失,service 用 SKILL.md frontmatter 的 description 兜底。
  // 跟 category 走同样的「DTO 放宽 + service 兜底」模式 — curl payload 写
  // "test" 不再 422,UI 自动填的 description 优先级仍然最高。
  @ApiPropertyOptional({
    example: 'Core principles for evaluating trade setups',
    minLength: 10,
    maxLength: 500,
    description:
      'Optional. If omitted or shorter than 10 chars, the service falls back to the description parsed from <slug>/SKILL.md frontmatter.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ example: 'First publish' })
  @IsOptional()
  @IsString()
  changelog?: string;

  // ★ Optional category override — takes precedence over frontmatter's
  // category. Lets the upload UI pick from the predefined set
  // (宏观 / 行业 / 量化) without forcing the .md author to write it.
  @ApiPropertyOptional({
    example: '量化',
    description:
      'Predefined category that overrides frontmatter. One of 宏观 / 行业 / 量化 or any custom string (max 64 chars).',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  category?: string;

  // ★ Optional optimistic lock — used by update flow. When set, server
  // enforces: if skill.updatedAt has changed since, returns 409 Conflict.
  @ApiPropertyOptional({
    example: '2026-08-22T10:30:00Z',
    description:
      'Optional ISO 8601. When set, server enforces optimistic lock: if skill.updatedAt has changed since, returns 409. Only used for update flows.',
  })
  @IsOptional()
  @IsString()
  expectedUpdatedAt?: string;
}

/**
 * Same shape used by the internal route helper / tests.
 */
export type ConfirmSkillContentPayload = ConfirmSkillContentDto & {
  skillId: string;
};

/**
 * Path-param DTO wrapper used by controllers that validate UUID on the
 * `{id}` route param. Re-exported for use by other skills controllers.
 */
export class SkillIdParamDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  id!: string;
}
