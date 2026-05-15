import { ApiProperty } from '@nestjs/swagger';

export class OssItemDto {
  @ApiProperty({ description: '文件/目录 key' })
  key: string;

  @ApiProperty({ description: '文件大小（字节）' })
  size: number;

  @ApiProperty({ description: '最后修改时间' })
  last_modified: string;

  @ApiProperty({ description: '类型：file 或 dir' })
  type: 'file' | 'dir';
}

export class OssListResponseDto {
  @ApiProperty({ description: '当前路径' })
  path: string;

  @ApiProperty({ description: '路径前缀' })
  prefix: string;

  @ApiProperty({ description: '分页游标' })
  marker: string;

  @ApiProperty({ description: '最大返回数量' })
  max_keys: number;

  @ApiProperty({ description: '是否还有更多' })
  is_truncated: boolean;

  @ApiProperty({ description: '文件列表', type: [OssItemDto] })
  items: OssItemDto[];
}

export class OssDownloadResponseDto {
  @ApiProperty({ description: '下载预签名 URL' })
  url: string;

  @ApiProperty({ description: '过期时间' })
  expires_at: string;
}

export class OssUploadPresignResponseDto {
  @ApiProperty({ description: '上传预签名 URL' })
  url: string;

  @ApiProperty({ description: '文件路径' })
  key: string;

  @ApiProperty({ description: '过期时间' })
  expires_at: string;
}

export class OssDeleteResponseDto {
  @ApiProperty({ description: '成功删除的文件列表' })
  deleted: string[];

  @ApiProperty({ description: '删除失败的文件列表' })
  failed: string[];
}

export class OssMkdirResponseDto {
  @ApiProperty({ description: '创建的目录路径' })
  key: string;
}
