import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsIn, IsNumber } from 'class-validator';
import { Type, plainToInstance, Transform } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { Consumption } from '../domain/consumption';

export class FilterConsumptionDto {
  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @IsNumber()
  userId?: number;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  userName?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  userEmail?: string;

  @ApiPropertyOptional({ enum: ['chat', 'redeem', 'other'] })
  @IsOptional()
  @IsIn(['chat', 'redeem', 'other'])
  consumeType?: 'chat' | 'redeem' | 'other';

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  dateTo?: string;
}

export class SortConsumptionDto {
  @ApiProperty()
  @Type(() => String)
  @IsString()
  orderBy: keyof Consumption;

  @ApiProperty()
  @IsString()
  order: 'ASC' | 'DESC';
}

export class QueryConsumptionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @Transform(({ value }) =>
    value
      ? plainToInstance(FilterConsumptionDto, JSON.parse(value))
      : undefined,
  )
  @ValidateNested()
  @Type(() => FilterConsumptionDto)
  filters?: FilterConsumptionDto | null;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @Transform(({ value }) => {
    return value
      ? plainToInstance(SortConsumptionDto, JSON.parse(value))
      : undefined;
  })
  @ValidateNested({ each: true })
  @Type(() => SortConsumptionDto)
  sort?: SortConsumptionDto[] | null;
}
