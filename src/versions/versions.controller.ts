import {
  Controller,
  Get,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiParam } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { MenuAccessGuard } from '../menus/menu-access.guard';
import { MenuPaths } from '../menus/menu-paths.decorator';
import {
  VersionFileInfo,
  VersionInfo,
  VersionService,
} from './version.service';

/**
 * A `VersionFileInfo` augmented with the `version` it came from. Built by the
 * `getVersionFiles` endpoint when `version` query param is omitted (so we have
 * to fan out across multiple versions).
 */
type VersionedFileInfo = VersionFileInfo & { version: string };

@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), MenuAccessGuard)
@ApiTags('Versions')
@Controller({
  path: 'versions',
  version: '1',
})
export class VersionController {
  constructor(private readonly versionService: VersionService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @MenuPaths('/versions')
  async findAll(@Query('source') source?: string): Promise<{
    data: VersionInfo[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const result = await this.versionService.getVersions(source);

    return {
      data: result.versions,
      total: result.versions.length,
      page: 1,
      pageSize: 100,
    };
  }

  @Get('sources')
  @HttpCode(HttpStatus.OK)
  async getSources(): Promise<{
    data: string[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const result = await this.versionService.getSources();

    return {
      data: result.sources,
      total: result.sources.length,
      page: 1,
      pageSize: 100,
    };
  }

  @Get(':source/files')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'source', type: String })
  async getVersionFiles(
    @Param('source') source: string,
    @Query('version') version?: string,
  ): Promise<{
    data: VersionFileInfo[] | VersionedFileInfo[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    // If version is not provided, get files for all versions of this source
    if (!version) {
      const versionsResult = await this.versionService.getVersions(source);
      const allFiles: VersionedFileInfo[] = [];

      for (const v of versionsResult.versions) {
        const filesResult = await this.versionService.getVersionFiles(
          source,
          v.version,
        );
        allFiles.push(
          ...filesResult.files.map((f) => ({ ...f, version: v.version })),
        );
      }

      return {
        data: allFiles,
        total: allFiles.length,
        page: 1,
        pageSize: 100,
      };
    }

    const result = await this.versionService.getVersionFiles(source, version);

    return {
      data: result.files,
      total: result.files.length,
      page: 1,
      pageSize: 100,
    };
  }
}
