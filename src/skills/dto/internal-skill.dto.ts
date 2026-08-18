import { ApiProperty } from '@nestjs/swagger';
import {
  IsObject,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

/**
 * Internal-skill query parameters shared by GET endpoints.
 *
 * Per audit §1.1 (no versioning): NO `version` field. `contentHash`
 * is the cache key the caller uses to ask for a specific revision.
 * Omitting it returns the current published content.
 */
export class InternalSkillContentHashQueryDto {
  @ApiProperty({
    required: false,
    description:
      'Optional sha256 of the zip the caller wants. If supplied and the skill has a different content_hash, returns 404.',
    minLength: 64,
    maxLength: 64,
  })
  @IsOptional()
  @IsString()
  @Length(64, 64)
  contentHash?: string;
}

/**
 * Query DTO for /files/content. Adds the `path` parameter and
 * inherits `contentHash`.
 *
 * Path format: relative to the skill root (no leading `/`, no `..`).
 * Path traversal defense happens in the service layer (audit C-3).
 */
export class InternalSkillFileContentQueryDto extends InternalSkillContentHashQueryDto {
  @ApiProperty({
    example: 'principles.md',
    description:
      'Relative path inside the skill. Must be in skill_file.relative_path.',
  })
  @IsString()
  @Matches(/^[A-Za-z0-9._\-/]+$/, {
    message:
      'path may only contain letters, digits, dot, underscore, dash, slash',
  })
  path!: string;
}

/**
 * Body DTO for POST /internal/skills/{id}/tools/{toolName}/execute.
 *
 * The validated JSON object (validated against tool.params_schema by
 * the service via Ajv) lives in `args`. The DTO only enforces the
 * outer shape; per-field constraints come from the per-tool schema.
 */
export class InternalSkillExecuteToolDto {
  @ApiProperty({
    type: Object,
    description:
      'Arguments object. Validated server-side against the tool.params_schema (Ajv).',
    additionalProperties: true,
  })
  @IsObject()
  args!: Record<string, unknown>;
}
