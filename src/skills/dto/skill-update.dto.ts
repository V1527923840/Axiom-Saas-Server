import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export type SkillUpdateEventAction = 'update' | 'archive' | 'restore';
export type SkillUpdateEventActorRole = 'self' | 'admin' | 'super_admin';

export class SkillUpdateEventDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: ['update', 'archive', 'restore'] })
  action!: SkillUpdateEventAction;

  @ApiProperty({ example: 42 })
  actorUserId!: number;

  @ApiProperty({ enum: ['self', 'admin', 'super_admin'] })
  actorRole!: SkillUpdateEventActorRole;

  @ApiPropertyOptional({ nullable: true })
  ossKey!: string | null;

  @ApiPropertyOptional({ nullable: true })
  oldHash!: string | null;

  @ApiPropertyOptional({ nullable: true })
  newHash!: string | null;

  @ApiPropertyOptional({ enum: ['md', 'zip'], nullable: true })
  sourceFormat!: 'md' | 'zip' | null;

  @ApiPropertyOptional({ nullable: true })
  changelog!: string | null;

  @ApiProperty({ example: '2026-08-22T10:30:00Z' })
  createdAt!: string;
}

export class ArchiveSkillDto {
  @ApiPropertyOptional({
    example: '违规内容',
    description: '可选:停用原因,会写入事件 changelog',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

export class RestoreSkillDto {
  @ApiPropertyOptional({ example: '审核通过', description: '可选:恢复原因' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

/**
 * Cursor-paginated query for GET /skills/:id/updates.
 *
 * Pass `before` (the oldest `createdAt` from the previous page) to
 * fetch the next batch — strictly newer-than is implicit via the DESC
 * order + LessThan filter. `limit` defaults to 100 to keep the timeline
 * drawer fast on first load.
 */
export class ListSkillUpdateEventsQueryDto {
  @ApiPropertyOptional({
    description: 'ISO 8601; fetch events with createdAt strictly before this',
    example: '2026-08-22T10:30:00Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  before?: Date;

  @ApiPropertyOptional({ example: 100, minimum: 1, maximum: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}

export class UpdateSkillUploadUrlOutputDto {
  @ApiProperty() uploadUrl!: string;
  @ApiProperty() key!: string;
  @ApiProperty({ format: 'uuid' }) skillId!: string;
  @ApiProperty() cdnUrl!: string;
  @ApiProperty() expiresAt!: number;
  @ApiProperty() updatedAt!: string;
  @ApiProperty({ enum: ['self', 'admin', 'super_admin'] })
  actorRole!: SkillUpdateEventActorRole;
}
