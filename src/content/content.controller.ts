import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpCode,
  ParseUUIDPipe,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiParam, ApiOperation } from '@nestjs/swagger';
import { ContentService } from './content.service';
import { CreateContentDto } from './dto/create-content.dto';
import { QueryContentDto } from './dto/query-content.dto';
import { ContentCategory } from './domain/content-category';
import { ContentItem } from './domain/content-item';

@ApiTags('Content')
@Controller({
  path: 'content',
  version: '1',
})
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Get('categories')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all content categories' })
  async getCategories(): Promise<{ data: ContentCategory[] }> {
    const categories = await this.contentService.getCategories();
    return { data: categories };
  }

  @Get(':categoryCode')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get content list by category code' })
  @ApiParam({
    name: 'categoryCode',
    type: String,
    required: true,
    description:
      'Category code: daily-news, audio-interpretation, institution-reports',
  })
  async getContentList(
    @Param('categoryCode') categoryCode: string,
    @Query() query: QueryContentDto,
  ): Promise<{
    data: ContentItem[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const pageNum = query.page ?? 1;
    let limitNum = query.pageSize ?? 50;
    if (limitNum > 100) limitNum = 100;

    const result = await this.contentService.getContentList(categoryCode, {
      page: pageNum,
      pageSize: limitNum,
      filters: query.filters,
      sort: query.sort,
    });

    return {
      data: result.data,
      total: result.total,
      page: pageNum,
      pageSize: limitNum,
    };
  }

  @Get(':categoryCode/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get content detail by category code and id' })
  @ApiParam({
    name: 'categoryCode',
    type: String,
    required: true,
  })
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  async getContentDetail(
    @Param('categoryCode') categoryCode: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ data: ContentItem }> {
    const content = await this.contentService.getContentDetail(
      categoryCode,
      id,
    );
    if (!content) {
      throw new NotFoundException({
        status: 404,
        errors: {
          content: 'Content not found',
        },
      });
    }
    return { data: content };
  }

  @Post(':categoryCode')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new content in category' })
  @ApiParam({
    name: 'categoryCode',
    type: String,
    required: true,
  })
  async createContent(
    @Param('categoryCode') categoryCode: string,
    @Body() createContentDto: CreateContentDto,
  ): Promise<{ data: ContentItem }> {
    const content = await this.contentService.createContent(
      categoryCode,
      createContentDto,
    );
    return { data: content };
  }

  @Delete(':categoryCode/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete content by category code and id' })
  @ApiParam({
    name: 'categoryCode',
    type: String,
    required: true,
  })
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  async deleteContent(
    @Param('categoryCode') categoryCode: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: boolean }> {
    await this.contentService.deleteContent(categoryCode, id);
    return { success: true };
  }
}
