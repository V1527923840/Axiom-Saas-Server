import { ApiProperty } from '@nestjs/swagger';
import {
  SkillEntity,
  SkillToolSchema,
} from '../infrastructure/persistence/relational/entities/skill.entity';

/**
 * Read DTO returned by the public REST API.
 *
 * Mirrors the columns that the spec §4.4 "detail" view exposes —
 * manifest content and tools are intentionally kept (admin + the
 * marketplace detail page both want them).
 */
export class SkillResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'principles-skill' })
  code!: string;

  @ApiProperty({ example: 'Trading Principles' })
  name!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty({ nullable: true })
  category!: string | null;

  @ApiProperty({ type: [String], nullable: true })
  tags!: string[] | null;

  @ApiProperty({ nullable: true })
  thumbnailUrl!: string | null;

  @ApiProperty({ enum: ['platform', 'user_self', 'third_party'] })
  uploaderType!: SkillEntity['uploaderType'];

  @ApiProperty({ enum: ['private', 'pending', 'listed'] })
  marketplaceStatus!: SkillEntity['marketplaceStatus'];

  @ApiProperty({ enum: ['draft', 'published', 'archived'] })
  status!: SkillEntity['status'];

  @ApiProperty({ nullable: true })
  contentHash!: string | null;

  @ApiProperty({ nullable: true })
  publishedAt!: Date | null;

  @ApiProperty({ nullable: true })
  changelog!: string | null;

  @ApiProperty({ type: [Object], description: 'Tool schema list (jsonb)' })
  tools!: SkillToolSchema[];

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

/**
 * File-metadata DTO for GET /skills/{id}/files?contentHash=X.
 * Content is intentionally NOT included (per spec §4.4).
 */
export class SkillFileIndexDto {
  @ApiProperty({ example: 'principles.md' })
  relativePath!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty({ nullable: true })
  tokenEstimate!: number | null;
}

/**
 * Tool summary DTO for GET /skills/{id}/tools?contentHash=X.
 */
export class SkillToolSummaryDto {
  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty({ type: Object, nullable: true })
  parameters!: Record<string, unknown> | null;

  @ApiProperty()
  tokenEstimate!: number | null;
}

/**
 * Body for PUT /sessions/{id}/skills/{skillId}.
 */
export class MountSkillDto {
  @ApiProperty({
    enum: ['add', 'remove'],
    example: 'add',
    description:
      'add — mount the skill to this session; remove — unmount it for this session only (the user-skill-binding is untouched).',
  })
  op!: 'add' | 'remove';

  @ApiProperty({
    enum: ['manual', 'auto_matched'],
    example: 'manual',
    required: false,
    description: 'defaults to "manual" if omitted',
  })
  source?: 'manual' | 'auto_matched';
}

/**
 * Personal-skill DTO returned by GET /users/me/skills.
 *
 * Extends SkillResponseDto with the binding's `enabled` flag so the
 * client can render enabled vs favorited-only cards differently.
 * Status defaults to false when the binding exists but is disabled
 * (收藏后未启用).
 */
export class MySkillDto extends SkillResponseDto {
  @ApiProperty({
    description:
      'true = binding is enabled (user can mount to sessions); false = favorited but not enabled.',
  })
  enabled!: boolean;
}

/**
 * Session-mount list item for GET /sessions/{id}/skills.
 */
export class SessionSkillMountItemDto {
  @ApiProperty({ format: 'uuid' })
  skillId!: string;

  @ApiProperty({ enum: ['add', 'remove'] })
  op!: 'add' | 'remove';

  @ApiProperty({ enum: ['manual', 'auto_matched'] })
  source!: 'manual' | 'auto_matched';

  @ApiProperty()
  mountedAt!: Date;
}
