import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiParam } from '@nestjs/swagger';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../roles/roles.guard';
import { infinityPagination } from '../utils/infinity-pagination';
import { PaginatedApiResponseDto } from '../utils/dto/infinity-pagination-response.dto';
import { NullableType } from '../utils/types/nullable.type';
import { ParseTask } from './domain/parse-task';
import { ParseTaskService } from './parse-task.service';
import { VersionService } from '../services/version-service';
import {
  CreateParseTaskDto,
  ParseTaskQueryDto,
  ExecuteParseTaskDto,
} from './dto/parse-task.dto';

@ApiBearerAuth()
@Roles(RoleEnum.admin)
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiTags('ParseTasks')
@Controller({
  path: 'parse/tasks',
  version: '1',
})
export class ParseTaskController {
  constructor(
    private readonly parseTaskService: ParseTaskService,
    private readonly versionService: VersionService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query() query: ParseTaskQueryDto,
  ): Promise<PaginatedApiResponseDto<ParseTask>> {
    const pageNum = query.page ?? 1;
    let limitNum = query.limit ?? 50;
    if (limitNum > 100) {
      limitNum = 100;
    }

    const result = await this.parseTaskService.findAll({
      ...query,
      page: pageNum,
      limit: limitNum,
    });

    return infinityPagination(
      result.data,
      { page: pageNum, limit: limitNum },
      result.total,
    ) as PaginatedApiResponseDto<ParseTask>;
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', type: String })
  async findOne(@Param('id') id: string): Promise<NullableType<ParseTask>> {
    return this.parseTaskService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDto: CreateParseTaskDto): Promise<{
    success: boolean;
    data: { taskId: string; status: string; message: string };
  }> {
    const task = await this.parseTaskService.create(createDto);

    return {
      success: true,
      data: {
        taskId: task.id,
        status: task.status,
        message: 'Task created successfully',
      },
    };
  }

  @Post(':id/execute')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', type: String })
  async execute(
    @Param('id') id: string,
    @Body() executeDto: ExecuteParseTaskDto,
  ): Promise<{
    success: boolean;
    data: { taskId: string; status: string; agentJobId: string };
  }> {
    const task = await this.parseTaskService.execute(id, executeDto.parser);

    return {
      success: true,
      data: {
        taskId: task.id,
        status: task.status,
        agentJobId: 'placeholder-agent-job-id', // Would be replaced with actual agent job ID
      },
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', type: String })
  async delete(
    @Param('id') id: string,
  ): Promise<{ success: boolean; data: null; message: string }> {
    await this.parseTaskService.delete(id);

    return {
      success: true,
      data: null,
      message: 'Task deleted successfully',
    };
  }
}

@ApiBearerAuth()
@Roles(RoleEnum.admin)
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiTags('Versions')
@Controller({
  path: 'versions',
  version: '1',
})
export class VersionController {
  constructor(private readonly versionService: VersionService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(@Query('source') source?: string): Promise<{
    data: any[];
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
    data: any[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    // If version is not provided, get files for all versions of this source
    if (!version) {
      const versionsResult = await this.versionService.getVersions(source);
      const allFiles: any[] = [];

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
