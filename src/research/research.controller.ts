import {
  Controller,
  Get,
  Param,
  Query,
  HttpStatus,
  HttpCode,
  ParseIntPipe,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ResearchService } from './research.service';
import { QueryResearchDto } from './dto/query-research.dto';
import { ResearchAnalysis, ResearchAnalysisListItem } from './domain/research';

@ApiTags('Research')
@Controller({
  path: 'research-analysis',
  version: '1',
})
export class ResearchController {
  constructor(private readonly researchService: ResearchService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get research analysis list' })
  async getResearchList(@Query() query: QueryResearchDto): Promise<{
    data: ResearchAnalysisListItem[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const pageNum = query.page ?? 1;
    let pageSizeNum = query.pageSize ?? 10;
    if (pageSizeNum > 100) pageSizeNum = 100;

    const result = await this.researchService.getResearchList({
      ...query,
      page: pageNum,
      pageSize: pageSizeNum,
    });

    return {
      data: result.data,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    };
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get research analysis detail by id' })
  async getResearchDetail(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ data: ResearchAnalysis }> {
    const research = await this.researchService.getResearchDetail(id);
    if (!research) {
      throw new NotFoundException({
        status: 404,
        errors: {
          research: 'Research analysis not found',
        },
      });
    }
    return research;
  }
}
