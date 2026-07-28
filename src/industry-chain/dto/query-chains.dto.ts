// src/industry-chain/dto/query-chains.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class QueryChainsDto extends PaginationQueryDto {
  @ApiProperty({ description: '申万二级行业代码', example: '110500' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(6)
  l2!: string;
}
