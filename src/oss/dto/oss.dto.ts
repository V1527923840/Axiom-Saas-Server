import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class OssListDto {
  @ApiPropertyOptional({ description: '目录路径，默认 /' })
  @IsOptional()
  @IsString()
  path?: string;

  @ApiPropertyOptional({ description: '分页游标' })
  @IsOptional()
  @IsString()
  marker?: string;

  @ApiPropertyOptional({ description: '最大返回数量，默认 100' })
  @IsOptional()
  @IsString()
  max_keys?: number;
}

export class OssDeleteDto {
  @ApiProperty({ description: '要删除的文件路径列表', type: [String] })
  @IsArray()
  keys: string[];
}

export class OssMkdirDto {
  @ApiProperty({ description: '目录路径' })
  @IsString()
  path: string;
}

export class OssUploadPresignDto {
  @ApiProperty({ description: '文件存储路径' })
  @IsString()
  path: string;

  @ApiPropertyOptional({ description: 'Content-Type' })
  @IsOptional()
  @IsString()
  content_type?: string;
}
