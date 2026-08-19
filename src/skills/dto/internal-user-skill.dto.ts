import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Lightweight per-skill summary returned by the
 * `GET /internal/users/:uid/skills` endpoint.
 *
 * Modeled on `SkillMetaResponse` (see internal-skill-tool.service.ts) but
 * trimmed to the fields VibeTrading needs to build the
 * `{skill_descriptions}` block of its system prompt — no files[] listing,
 * no tool schema details, just the metadata vibe uses for routing /
 * cache-key decisions.
 *
 * ★ Field contract (per plan §Task 1): `id, name, description, category,
 * tags, contentHash, toolsCount, manifestTokenEstimate, totalTokenEstimate`.
 * Tools detail is intentionally absent — vibe fetches it on demand via
 * `GET /internal/skills/:id/meta?contentHash=...`.
 */
export class SkillSummaryDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  id!: string;

  @ApiProperty({ example: 'Trading Principles', maxLength: 128 })
  @IsString()
  @MaxLength(128)
  name!: string;

  @ApiProperty({ required: false, maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ required: false, nullable: true, maxLength: 64 })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  category?: string;

  @ApiProperty({ required: false, nullable: true, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ required: false, nullable: true, maxLength: 64 })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  contentHash?: string;

  @ApiProperty({ description: 'Derived from skill.tools jsonb length.' })
  @IsInt()
  @Min(0)
  toolsCount!: number;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  manifestTokenEstimate?: number;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  totalTokenEstimate?: number;
}
