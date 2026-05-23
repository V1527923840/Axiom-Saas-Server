import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
import { MenuAccessGuard } from '../menus/menu-access.guard';
import { MenuPaths } from '../menus/menu-paths.decorator';
import { CategoriesService } from './categories.service';
import { Category } from './domain/category';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  QueryCategoryDto,
} from './dto/category.dto';
import { infinityPagination } from '../utils/infinity-pagination';

@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), MenuAccessGuard)
@ApiTags('Categories')
@Controller({
  path: 'categories',
  version: '1',
})
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @MenuPaths('/categories')
  @ApiOperation({ summary: 'Get all categories with optional filters' })
  async findAll(@Query() query: QueryCategoryDto): Promise<{
    data: Category[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const pageNum = query.page ?? 1;
    let limitNum = query.limit ?? 50;
    if (limitNum > 100) limitNum = 100;

    const result = await this.categoriesService.findAllWithPagination({
      paginationOptions: { page: pageNum, limit: limitNum },
      filters: {
        layer: query.layer ?? null,
        parentCode: query.parentCode ?? null,
        isActive: query.isActive ?? null,
      },
    });

    return infinityPagination(
      result.data,
      { page: pageNum, limit: limitNum },
      result.total,
    ) as { data: Category[]; total: number; page: number; pageSize: number };
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get category by ID' })
  @ApiParam({ name: 'id', type: String })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ data: Category }> {
    const category = await this.categoriesService.findById(id);
    return { data: category };
  }

  @Get(':id/children')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get children of a category' })
  @ApiParam({ name: 'id', type: String })
  async findChildren(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ data: Category[] }> {
    const children = await this.categoriesService.findChildren(id);
    return { data: children };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new category' })
  async create(
    @Body() createDto: CreateCategoryDto,
  ): Promise<{ data: Category }> {
    const category = await this.categoriesService.create(createDto);
    return { data: category };
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a category' })
  @ApiParam({ name: 'id', type: String })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateCategoryDto,
  ): Promise<{ data: Category }> {
    const category = await this.categoriesService.update(id, updateDto);
    return { data: category };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a category' })
  @ApiParam({ name: 'id', type: String })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: boolean }> {
    return this.categoriesService.delete(id);
  }
}
