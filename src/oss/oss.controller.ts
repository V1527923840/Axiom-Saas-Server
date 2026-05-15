import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { OssService } from './oss.service';
import {
  OssListDto,
  OssDeleteDto,
  OssMkdirDto,
  OssUploadPresignDto,
} from './dto/oss.dto';
import {
  OssListResponseDto,
  OssDownloadResponseDto,
  OssUploadPresignResponseDto,
  OssDeleteResponseDto,
  OssMkdirResponseDto,
} from './dto/oss-response.dto';

@ApiTags('OSS')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({ path: 'oss', version: '1' })
export class OssController {
  constructor(private readonly ossService: OssService) {}

  @Get('list')
  async list(@Query() query: OssListDto): Promise<OssListResponseDto> {
    const result = await this.ossService.list(
      query.path || '/',
      query.marker,
      query.max_keys ? Number(query.max_keys) : 100,
    );
    return result;
  }

  @Get('download/:key')
  async download(@Param('key') key: string): Promise<OssDownloadResponseDto> {
    const decodedKey = decodeURIComponent(key);
    return this.ossService.getDownloadUrl(decodedKey);
  }

  @Post('delete')
  async delete(@Body() body: OssDeleteDto): Promise<OssDeleteResponseDto> {
    return this.ossService.deleteFiles(body.keys);
  }

  @Post('upload/presign')
  async getUploadPresignedUrl(
    @Body() body: OssUploadPresignDto,
  ): Promise<OssUploadPresignResponseDto> {
    return this.ossService.getUploadPresignedUrl(body.path, body.content_type);
  }

  @Post('mkdir')
  async mkdir(@Body() body: OssMkdirDto): Promise<OssMkdirResponseDto> {
    return this.ossService.mkdir(body.path);
  }
}
