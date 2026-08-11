import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  FindOptionsWhere,
  ILike,
  Between,
  MoreThanOrEqual,
  LessThanOrEqual,
} from 'typeorm';
import { ContentItemEntity } from '../entities/content-item.entity';
import { ContentItemMapper } from '../mappers/content-item.mapper';
import { ContentItemRepository } from '../../content-item.repository';
import { ContentItem } from '../../../../domain/content-item';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';
import {
  FilterContentDto,
  SortContentDto,
} from '../../../../dto/query-content.dto';

@Injectable()
export class ContentItemRelationalRepository implements ContentItemRepository {
  constructor(
    @InjectRepository(ContentItemEntity)
    private readonly contentItemRepository: Repository<ContentItemEntity>,
  ) {}

  async findManyWithPagination({
    categoryId,
    filterOptions,
    sortOptions,
    paginationOptions,
  }: {
    categoryId: string;
    filterOptions?: FilterContentDto | null;
    sortOptions?: SortContentDto[] | null;
    paginationOptions: IPaginationOptions;
  }): Promise<ContentItem[]> {
    const where: FindOptionsWhere<ContentItemEntity> = { categoryId };

    if (filterOptions?.status) {
      where.status = filterOptions.status;
    }

    if (filterOptions?.sentiment) {
      where.sentiment = filterOptions.sentiment;
    }

    if (filterOptions?.parser) {
      where.parser = filterOptions.parser;
    }

    if (filterOptions?.company) {
      // Search in companies JSONB array
      where.companies = ILike(`%${filterOptions.company}%`);
    }

    if (filterOptions?.dateFrom && filterOptions?.dateTo) {
      where.contentTimestamp = Between(
        new Date(filterOptions.dateFrom),
        new Date(filterOptions.dateTo),
      );
    } else if (filterOptions?.dateFrom) {
      where.contentTimestamp = MoreThanOrEqual(
        new Date(filterOptions.dateFrom),
      );
    } else if (filterOptions?.dateTo) {
      where.contentTimestamp = LessThanOrEqual(new Date(filterOptions.dateTo));
    }

    const entities = await this.contentItemRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
      where,
      order: sortOptions?.reduce(
        (accumulator, sort) => ({
          ...accumulator,
          [sort.orderBy as string]: sort.order,
        }),
        { collectedAt: 'DESC' },
      ),
    });

    return entities.map((entity) => ContentItemMapper.toDomain(entity));
  }

  async findById(id: ContentItem['id']): Promise<NullableType<ContentItem>> {
    const entity = await this.contentItemRepository.findOne({
      where: { id },
    });
    return entity ? ContentItemMapper.toDomain(entity) : null;
  }

  async create(
    data: Omit<ContentItem, 'id' | 'createdAt' | 'updatedAt' | 'collectedAt'>,
  ): Promise<ContentItem> {
    const persistenceModel = ContentItemMapper.toPersistence(
      data as ContentItem,
    );
    const newEntity = await this.contentItemRepository.save(
      this.contentItemRepository.create(persistenceModel),
    );
    return ContentItemMapper.toDomain(newEntity);
  }

  async softDelete(id: ContentItem['id']): Promise<void> {
    await this.contentItemRepository.softDelete(id);
  }
}
