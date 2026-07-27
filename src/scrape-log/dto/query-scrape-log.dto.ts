import { IsIn, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class QueryScrapeLogDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['pending', 'running', 'success', 'failed'] })
  @IsOptional()
  @IsIn(['pending', 'running', 'success', 'failed'])
  status?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  source?: string;
}
