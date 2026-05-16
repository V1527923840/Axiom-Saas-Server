import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpCode,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../roles/roles.guard';
import { EtlService } from './etl.service';
import {
  ImportRequestDto,
  JobListQueryDto,
  ScanFilesResponseDto,
  ImportResponseDto,
  JobStatusDto,
} from './dto/etl.dto';

@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiTags('ETL')
@Controller({
  path: 'etl',
  version: '1',
})
export class EtlController {
  constructor(private readonly etlService: EtlService) {}

  @Get('files')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Scan pending import files in output_v2 directory' })
  async scanFiles(): Promise<ScanFilesResponseDto> {
    return this.etlService.scanFiles();
  }

  @Post('import')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Execute import for selected files' })
  async importFiles(
    @Body() request: ImportRequestDto,
  ): Promise<{ data: ImportResponseDto }> {
    const result = await this.etlService.importFiles(request);
    return { data: result };
  }

  @Get('jobs')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get import job history' })
  async getJobHistory(@Query() query: JobListQueryDto): Promise<{
    data: JobStatusDto[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const pageNum = query.page ?? 1;
    let limitNum = query.pageSize ?? 50;
    if (limitNum > 100) limitNum = 100;

    const result = await this.etlService.getJobHistory({
      ...query,
      page: pageNum,
      pageSize: limitNum,
    });

    return {
      data: result.data,
      total: result.total,
      page: pageNum,
      pageSize: limitNum,
    };
  }

  @Get('jobs/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get job status by ID' })
  @ApiParam({ name: 'id', type: String })
  async getJobStatus(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ data: JobStatusDto }> {
    const result = await this.etlService.getJobStatus(id);
    return { data: result };
  }
}
