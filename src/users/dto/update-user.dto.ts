import { ApiPropertyOptional } from '@nestjs/swagger';

import { Transform, Type } from 'class-transformer';
import { IsEmail, IsOptional, MinLength } from 'class-validator';
import { FileDto } from '../../files/dto/file.dto';
import { RoleDto } from '../../roles/dto/role.dto';
import { StatusDto } from '../../statuses/dto/status.dto';
import { lowerCaseTransformer } from '../../utils/transformers/lower-case.transformer';

// Define UpdateUserDto independently to avoid conflicts with CreateUserDto's strict types
export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'test1@example.com', type: String })
  @Transform(lowerCaseTransformer)
  @IsOptional()
  @IsEmail()
  email?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @MinLength(6)
  password?: string;

  provider?: string;

  socialId?: string | null;

  @ApiPropertyOptional({ example: 'John', type: String })
  @IsOptional()
  firstName?: string | null;

  @ApiPropertyOptional({ example: 'Doe', type: String })
  @IsOptional()
  lastName?: string | null;

  @ApiPropertyOptional({ type: () => FileDto })
  @IsOptional()
  photo?: FileDto | null;

  @ApiPropertyOptional({ type: () => RoleDto })
  @IsOptional()
  @Type(() => RoleDto)
  role?: RoleDto | null;

  @ApiPropertyOptional({ type: () => StatusDto })
  @IsOptional()
  @Type(() => StatusDto)
  status?: StatusDto;

  @ApiPropertyOptional({ example: 'Lv0', type: String })
  @IsOptional()
  tier?: string;

  @ApiPropertyOptional({ example: 'plan-uuid', type: String })
  @IsOptional()
  currentPlanId?: string | null;

  @ApiPropertyOptional({ example: 100, type: Number })
  @IsOptional()
  pointsBalance?: number;

  @ApiPropertyOptional({ example: 50, type: Number })
  @IsOptional()
  chatQuotaUsed?: number;

  @ApiPropertyOptional({ example: 100, type: Number })
  @IsOptional()
  chatQuotaTotal?: number;

  @ApiPropertyOptional({ example: '2026-06-11T00:00:00Z', type: String })
  @IsOptional()
  subscriptionExpiredAt?: string | null;

  @ApiPropertyOptional({ example: '2026-01-01T00:00:00Z', type: String })
  @IsOptional()
  registeredAt?: string | null;

  @ApiPropertyOptional({ example: '2026-05-10T00:00:00Z', type: String })
  @IsOptional()
  lastLoginAt?: string | null;
}
