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
