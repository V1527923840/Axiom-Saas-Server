// src/industry-chain/dto/query-l2.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class QueryL2Dto extends PaginationQueryDto {
  @ApiProperty({ description: '申万一级行业代码', example: '110000' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(6)
  l1!: string;
}
