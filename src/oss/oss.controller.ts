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
import { MenuAccessGuard } from '../menus/menu-access.guard';
import { MenuPaths } from '../menus/menu-paths.decorator';

@ApiTags('OSS')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), MenuAccessGuard)
@Controller({ path: 'oss', version: '1' })
export class OssController {
  constructor(private readonly ossService: OssService) {}

  @Get('list')
  @MenuPaths('/oss-browser')
  async list(@Query() query: OssListDto): Promise<OssListResponseDto> {
    const result = await this.ossService.list(
      query.path || '/',
      query.marker,
      query.max_keys ? Number(query.max_keys) : 100,
    );
    return result;
  }

  @Get('download/:key')
  @MenuPaths('/oss-browser')
  async download(@Param('key') key: string): Promise<OssDownloadResponseDto> {
    const decodedKey = decodeURIComponent(key);
    return this.ossService.getDownloadUrl(decodedKey);
  }

  @Post('delete')
  @MenuPaths('/oss-browser')
  async delete(@Body() body: OssDeleteDto): Promise<OssDeleteResponseDto> {
    return this.ossService.deleteFiles(body.keys);
  }

  @Post('upload/presign')
  @MenuPaths('/oss-browser')
  async getUploadPresignedUrl(
    @Body() body: OssUploadPresignDto,
  ): Promise<OssUploadPresignResponseDto> {
    return this.ossService.getUploadPresignedUrl(body.path, body.content_type);
  }

  @Post('mkdir')
  @MenuPaths('/oss-browser')
  async mkdir(@Body() body: OssMkdirDto): Promise<OssMkdirResponseDto> {
    return this.ossService.mkdir(body.path);
  }
}
