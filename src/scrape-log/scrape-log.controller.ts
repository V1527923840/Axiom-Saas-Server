import {
  Controller,
  Get,
  Param,
  Query,
  HttpStatus,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiParam } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { MenuAccessGuard } from '../menus/menu-access.guard';
import { MenuPaths } from '../menus/menu-paths.decorator';
import { infinityPagination } from '../utils/infinity-pagination';
import { PaginatedApiResponseDto } from '../utils/dto/infinity-pagination-response.dto';
import { NullableType } from '../utils/types/nullable.type';
import { ScrapeLog } from './domain/scrape-log';
import { ScrapeLogService } from './scrape-log.service';
import { QueryScrapeLogDto } from './dto/query-scrape-log.dto';

@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), MenuAccessGuard)
@ApiTags('ScrapeLog')
@Controller({
  path: 'scrape-log',
  version: '1',
})
export class ScrapeLogController {
  constructor(private readonly scrapeLogService: ScrapeLogService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @MenuPaths('/scrape-logs')
  async findAll(
    @Query() query: QueryScrapeLogDto,
  ): Promise<PaginatedApiResponseDto<ScrapeLog>> {
    const pageNum = query.page ?? 1;
    const limitNum = query.pageSize ?? 10;

    const result = await this.scrapeLogService.findAllWithPagination({
      paginationOptions: {
        page: pageNum,
        limit: limitNum,
      },
    });

    return infinityPagination(
      result.data,
      { page: pageNum, limit: limitNum },
      result.total,
    );
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', type: String })
  findOne(@Param('id') id: ScrapeLog['id']): Promise<NullableType<ScrapeLog>> {
    return this.scrapeLogService.findById(id);
  }
}
