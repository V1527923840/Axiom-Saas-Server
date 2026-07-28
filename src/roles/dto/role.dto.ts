import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class RoleDto {
  @ApiProperty()
  @IsNumber()
  id: number | string;
}

export class CreateRoleDto {
  @ApiProperty({ example: 'Editor' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'editor' })
  @IsString()
  code: string;

  @ApiProperty({ example: 'Can edit content', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateRoleDto {
  @ApiProperty({ example: 'Editor', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'editor', required: false })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiProperty({ example: 'Can edit content', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}

export class AssignMenusDto {
  @ApiProperty({ type: [String], example: ['uuid1', 'uuid2'] })
  @IsString({ each: true })
  menuIds: string[];
}

export class AssignUsersDto {
  @ApiProperty({ type: [Number], example: [1, 2, 3] })
  @IsNumber({}, { each: true })
  userIds: number[];
}

/**
 * Wire shape for GET /v1/roles.
 *
 * `isSuperAdmin` is derived in the controller from `code === 'super_admin'`
 * so the frontend never has to compare strings — it just renders
 * destructive style for `isSuperAdmin===true`.
 *
 * Kept separate from the internal `RoleDto` (which is reused by
 * user-create / user-update flows as a single-id payload) so the wire
 * shape can grow without churning unrelated DTOs.
 */
export class RoleResponseDto {
  @ApiProperty()
  @IsNumber()
  id: number;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  code: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: '是否为超级管理员(由 code 计算)' })
  isSuperAdmin: boolean;
}
