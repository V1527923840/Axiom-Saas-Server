import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsString, Length, Max, Min } from 'class-validator';

/**
 * Phase 1: request a presigned PUT URL for a skill zip / md blob.
 * Per audit C-1 (decision in Task 15 brief): keep the spec's two-step
 * pattern; phase 2 is the idempotent overwrite via PUT /skills/{id}/content.
 */
export class CreateSkillUploadUrlDto {
  @ApiProperty({ example: 'principles-skill.zip', maxLength: 255 })
  @IsString()
  @Length(1, 255)
  filename!: string;

  @ApiProperty({ example: 524288, description: 'Size in bytes (max 10 MiB)' })
  @IsInt()
  @Min(1)
  @Max(10 * 1024 * 1024)
  size!: number;

  @ApiProperty({ enum: ['md', 'zip'], example: 'zip' })
  @IsIn(['md', 'zip'])
  sourceFormat!: 'md' | 'zip';

  @ApiProperty({
    example: 'a'.repeat(64),
    description: 'sha256 of the zip/md blob (64 hex chars)',
  })
  @IsString()
  @Length(64, 64)
  hash!: string;
}
