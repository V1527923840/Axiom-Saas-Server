import {
  // decorators here
  Transform,
  Type,
} from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  // decorators here
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { FileDto } from '../../files/dto/file.dto';
import { RoleDto } from '../../roles/dto/role.dto';
import { StatusDto } from '../../statuses/dto/status.dto';
import { lowerCaseTransformer } from '../../utils/transformers/lower-case.transformer';

export class CreateUserDto {
  @ApiProperty({ example: 'test1@example.com', type: String })
  @Transform(lowerCaseTransformer)
  @IsNotEmpty()
  @IsEmail()
  email: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @MinLength(6)
  password?: string;

  provider?: string;

  socialId?: string | null;

  @ApiProperty({ example: 'John', type: String })
  @IsNotEmpty()
  firstName: string | null;

  @ApiPropertyOptional({ example: 'Doe', type: String })
  @IsOptional()
  @IsString()
  lastName?: string | null;

  @ApiPropertyOptional({ type: () => FileDto })
  @IsOptional()
  photo?: FileDto | null;

  @ApiPropertyOptional({ type: RoleDto })
  @IsOptional()
  @Type(() => RoleDto)
  role?: RoleDto | null;

  @ApiPropertyOptional({
    type: [Number],
    description: '角色 id 列表;留空将不写入 user_roles(若 role 不传则跳过)',
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Type(() => Number)
  roleIds?: number[];

  @ApiPropertyOptional({ type: StatusDto })
  @IsOptional()
  @Type(() => StatusDto)
  status?: StatusDto;

  @ApiPropertyOptional({ example: 'Lv0', type: String })
  @IsOptional()
  tier?: string;

  @ApiPropertyOptional({ example: 'plan-uuid', type: String })
  @IsOptional()
  currentPlanId?: string;

  @ApiPropertyOptional({ example: 0, type: Number })
  @IsOptional()
  pointsBalance?: number;

  @ApiPropertyOptional({ example: 0, type: Number })
  @IsOptional()
  chatQuotaUsed?: number;

  @ApiPropertyOptional({ example: 0, type: Number })
  @IsOptional()
  chatQuotaTotal?: number;

  @ApiPropertyOptional({ example: '2026-06-11T00:00:00Z', type: String })
  @IsOptional()
  subscriptionExpiredAt?: string;

  @ApiPropertyOptional({ example: '2026-01-01T00:00:00Z', type: String })
  @IsOptional()
  registeredAt?: string;

  @ApiPropertyOptional({ example: '2026-05-10T00:00:00Z', type: String })
  @IsOptional()
  lastLoginAt?: string;
}
