import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsIn,
  IsUUID,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateMenuDto {
  @ApiProperty({ type: String, example: '仪表盘' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ type: String, example: 'dashboard' })
  @IsNotEmpty()
  @IsString()
  code: string;

  @ApiPropertyOptional({ type: String, example: 'LayoutDashboard' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiProperty({ type: String, example: '/dashboard' })
  @IsNotEmpty()
  @IsString()
  path: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({ type: Number, example: 1 })
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({ enum: ['active', 'inactive'] })
  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: 'active' | 'inactive';
}

export class UpdateMenuDto {
  @ApiPropertyOptional({ type: String, example: '仪表盘' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ type: String, example: 'dashboard' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ type: String, example: 'LayoutDashboard' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ type: String, example: '/dashboard' })
  @IsOptional()
  @IsString()
  path?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({ type: Number, example: 1 })
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({ enum: ['active', 'inactive'] })
  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: 'active' | 'inactive';
}

export class AssignMenusDto {
  @ApiProperty({ type: [String], example: ['menu-id-1', 'menu-id-2'] })
  @IsNotEmpty()
  @Transform(({ value }) => (Array.isArray(value) ? value : JSON.parse(value)))
  menuIds: string[];
}
