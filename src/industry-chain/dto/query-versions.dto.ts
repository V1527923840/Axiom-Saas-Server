// src/industry-chain/dto/query-versions.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class QueryVersionsDto extends PaginationQueryDto {
  @ApiProperty({ description: '产业链 slug', example: 'ai-chip' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  chain!: string;
}
