import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { User } from '../domain/user';
import { RoleDto } from '../../roles/dto/role.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class FilterUserDto {
  @ApiPropertyOptional({ type: RoleDto })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => RoleDto)
  roles?: RoleDto[] | null;

  @ApiPropertyOptional({ example: 'Lv0', type: String })
  @IsOptional()
  @IsIn(['Lv0', 'Lv1', 'Lv2', 'Lv3'])
  tier?: string;

  @ApiPropertyOptional({ example: 'active', type: String })
  @IsOptional()
  @IsIn(['active', 'disabled'])
  status?: string;
}

export class SortUserDto {
  @ApiProperty()
  @Type(() => String)
  @IsString()
  orderBy: keyof User;

  @ApiProperty()
  @IsString()
  order: string;
}

export class QueryUserDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'role-id', type: String })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({
    example: 'active',
    enum: ['active', 'disabled'],
    type: String,
  })
  @IsOptional()
  @IsIn(['active', 'disabled'])
  status?: string;

  @ApiPropertyOptional({
    example: 'Lv1',
    enum: ['Lv0', 'Lv1', 'Lv2', 'Lv3'],
    type: String,
  })
  @IsOptional()
  @IsIn(['Lv0', 'Lv1', 'Lv2', 'Lv3'])
  tier?: string;
}
