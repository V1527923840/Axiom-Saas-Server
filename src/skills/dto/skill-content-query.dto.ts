import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

/**
 * Query DTO for endpoints that pin a specific content_hash.
 *
 * GET /skills/{id}/files?contentHash=X
 * GET /skills/{id}/tools?contentHash=X
 *
 * The contentHash is optional — when omitted the controller returns the
 * skill's currently-stored content (status='published' required).
 */
export class SkillContentHashQueryDto {
  @ApiProperty({
    example: 'a'.repeat(64),
    description:
      'sha256 of the desired content. Omit to use the current content hash.',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(64, 64)
  contentHash?: string;
}
