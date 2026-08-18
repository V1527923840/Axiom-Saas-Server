import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID, Length } from 'class-validator';

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

  @ApiProperty({ example: 'principles-skill', maxLength: 64 })
  @IsString()
  @Length(1, 64)
  code!: string;

  @ApiProperty({ example: 'Trading Principles', maxLength: 128 })
  @IsString()
  @Length(1, 128)
  name!: string;

  @ApiProperty({
    example: 'Core principles for evaluating trade setups',
    minLength: 10,
    maxLength: 500,
  })
  @IsString()
  @Length(10, 500)
  description!: string;

  @ApiPropertyOptional({ example: 'First publish' })
  @IsOptional()
  @IsString()
  changelog?: string;
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
