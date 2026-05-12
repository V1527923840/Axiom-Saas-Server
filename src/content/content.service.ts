import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ContentCategoryRepository } from './infrastructure/persistence/content-category.repository';
import { ContentItemRepository } from './infrastructure/persistence/content-item.repository';
import { ContentCategory } from './domain/content-category';
import { ContentItem } from './domain/content-item';
import { CreateContentDto } from './dto/create-content.dto';
import { FilterContentDto, SortContentDto } from './dto/query-content.dto';
import { NullableType } from '../utils/types/nullable.type';
import { IPaginationOptions } from '../utils/types/pagination-options';

@Injectable()
export class ContentService {
  constructor(
    private readonly contentCategoryRepository: ContentCategoryRepository,
    private readonly contentItemRepository: ContentItemRepository,
  ) {}

  async getCategories(): Promise<ContentCategory[]> {
    return this.contentCategoryRepository.findAll();
  }

  async getContentList(
    categoryCode: string,
    query: {
      page?: number;
      pageSize?: number;
      filters?: FilterContentDto | null;
      sort?: SortContentDto[] | null;
    },
  ): Promise<{
    data: ContentItem[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const { page = 1, pageSize = 10, filters, sort } = query;

    const category =
      await this.contentCategoryRepository.findByCode(categoryCode);
    if (!category) {
      throw new NotFoundException({
        status: 404,
        errors: {
          category: 'Category not found',
        },
      });
    }

    let limit = pageSize;
    if (limit > 100) {
      limit = 100;
    }

    const paginationOptions: IPaginationOptions = { page, limit };
    const contentItems =
      await this.contentItemRepository.findManyWithPagination({
        categoryId: category.id,
        filterOptions: filters,
        sortOptions: sort,
        paginationOptions,
      });

    // For now, we don't have a count query, so return items as data
    // In production, you'd want to add a count method to the repository
    return {
      data: contentItems,
      total: contentItems.length,
      page,
      pageSize: limit,
    };
  }

  async getContentDetail(
    categoryCode: string,
    id: string,
  ): Promise<NullableType<ContentItem>> {
    const category =
      await this.contentCategoryRepository.findByCode(categoryCode);
    if (!category) {
      throw new NotFoundException({
        status: 404,
        errors: {
          category: 'Category not found',
        },
      });
    }

    const contentItem = await this.contentItemRepository.findById(id);
    if (!contentItem || contentItem.categoryId !== category.id) {
      throw new NotFoundException({
        status: 404,
        errors: {
          content: 'Content not found',
        },
      });
    }

    return contentItem;
  }

  async createContent(
    categoryCode: string,
    createContentDto: CreateContentDto,
  ): Promise<ContentItem> {
    const category =
      await this.contentCategoryRepository.findByCode(categoryCode);
    if (!category) {
      throw new UnprocessableEntityException({
        status: 422,
        errors: {
          category: 'Category not found',
        },
      });
    }

    return this.contentItemRepository.create({
      categoryId: category.id,
      title: createContentDto.title,
      summary: createContentDto.summary ?? null,
      originalContent: createContentDto.originalContent ?? null,
      sourceFileUrl: createContentDto.sourceFileUrl ?? null,
      jsonFileUrl: createContentDto.jsonFileUrl ?? null,
      summaryFileUrl: createContentDto.summaryFileUrl ?? null,
      images: createContentDto.images ?? [],
      audioUrl: createContentDto.audioUrl ?? null,
      transcript: createContentDto.transcript ?? null,
      publishedAt: createContentDto.publishedAt
        ? new Date(createContentDto.publishedAt)
        : null,
      status: 'active',
      metadata: createContentDto.metadata ?? {},
    });
  }

  async deleteContent(categoryCode: string, id: string): Promise<void> {
    const category =
      await this.contentCategoryRepository.findByCode(categoryCode);
    if (!category) {
      throw new NotFoundException({
        status: 404,
        errors: {
          category: 'Category not found',
        },
      });
    }

    const contentItem = await this.contentItemRepository.findById(id);
    if (!contentItem || contentItem.categoryId !== category.id) {
      throw new NotFoundException({
        status: 404,
        errors: {
          content: 'Content not found',
        },
      });
    }

    await this.contentItemRepository.softDelete(id);
  }
}
