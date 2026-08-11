import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { DailySummary } from './domain/daily-summary';
import { DailySummaryService } from './daily-summary.service';
import { LatestQueryDto } from './dto/latest-query.dto';
import { ListQueryDto } from './dto/list-query.dto';
import { SourcesResponseDto } from './dto/sources-response.dto';

@ApiTags('DailySummary')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'daily-summary',
  version: '1',
})
export class DailySummaryController {
  constructor(private readonly dailySummaryService: DailySummaryService) {}

  @Get('latest')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get the latest summary for a frequency bucket' })
  latest(@Query() query: LatestQueryDto): Promise<DailySummary | null> {
    return this.dailySummaryService.getLatest(query.frequency);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List summaries with pagination' })
  list(@Query() query: ListQueryDto): Promise<{
    data: DailySummary[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    return this.dailySummaryService.list(query);
  }

  @Get(':reportId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a single summary by report id' })
  @ApiParam({ name: 'reportId', type: String, required: true })
  one(
    @Param('reportId', new ParseUUIDPipe()) reportId: string,
  ): Promise<DailySummary> {
    return this.dailySummaryService.getOne(reportId);
  }

  @Get(':reportId/sources')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get source content metadata for a summary' })
  @ApiParam({ name: 'reportId', type: String, required: true })
  sources(
    @Param('reportId', new ParseUUIDPipe()) reportId: string,
  ): Promise<SourcesResponseDto> {
    return this.dailySummaryService.getSources(reportId);
  }
}
