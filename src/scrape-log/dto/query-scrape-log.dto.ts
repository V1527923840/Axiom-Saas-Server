import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsIn } from 'class-validator';

export class QueryScrapeLogDto {
  @ApiPropertyOptional()
  @IsOptional()
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ enum: ['pending', 'running', 'success', 'failed'] })
  @IsOptional()
  @IsIn(['pending', 'running', 'success', 'failed'])
  status?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  source?: string;
}
