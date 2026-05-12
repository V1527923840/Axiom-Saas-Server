import {
  // decorators here
  Transform,
  Type,
} from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  // decorators here
  IsEmail,
  IsNotEmpty,
  IsOptional,
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

  @ApiProperty()
  @MinLength(6)
  password?: string;

  provider?: string;

  socialId?: string | null;

  @ApiProperty({ example: 'John', type: String })
  @IsNotEmpty()
  firstName: string | null;

  @ApiProperty({ example: 'Doe', type: String })
  @IsNotEmpty()
  lastName: string | null;

  @ApiPropertyOptional({ type: () => FileDto })
  @IsOptional()
  photo?: FileDto | null;

  @ApiPropertyOptional({ type: RoleDto })
  @IsOptional()
  @Type(() => RoleDto)
  role?: RoleDto | null;

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
