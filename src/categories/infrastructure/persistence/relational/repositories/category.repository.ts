import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { ContentCategoryEntity } from 'src/content/infrastructure/persistence/relational/entities/content-category.entity';
import { ContentItemEntity } from 'src/content/infrastructure/persistence/relational/entities/content-item.entity';
import { CategoryMapper } from 'src/categories/infrastructure/persistence/mappers/category.mapper';
import { CategoryRepository } from 'src/categories/infrastructure/persistence/category.repository';
import { Category } from 'src/categories/domain/category';
import { NullableType } from 'src/utils/types/nullable.type';

@Injectable()
export class CategoryRelationalRepository implements CategoryRepository {
  constructor(
    @InjectRepository(ContentCategoryEntity)
    private readonly categoryRepository: Repository<ContentCategoryEntity>,
    @InjectRepository(ContentItemEntity)
    private readonly contentItemRepository: Repository<ContentItemEntity>,
  ) {}

  async findAll(filters?: {
    layer?: string | null;
    parentCode?: string | null;
    isActive?: boolean | null;
  }): Promise<Category[]> {
    const where: Record<string, any> = {};

    if (filters?.layer) {
      where.layer = filters.layer;
    }
    if (filters?.parentCode) {
      where.parentCode = filters.parentCode;
    } else if (filters?.parentCode === null) {
      where.parentCode = IsNull();
    }
    if (filters?.isActive !== undefined && filters?.isActive !== null) {
      where.isActive = filters.isActive;
    }

    const entities = await this.categoryRepository.find({
      where,
      order: { sortOrder: 'ASC' },
    });
    return entities.map((entity) => CategoryMapper.toDomain(entity));
  }

  async findAllWithPagination({
    skip,
    take,
    filters,
  }: {
    skip: number;
    take: number;
    filters?: {
      layer?: string | null;
      parentCode?: string | null;
      isActive?: boolean | null;
    };
  }): Promise<{ data: Category[]; total: number }> {
    const where: Record<string, any> = {};

    if (filters?.layer) {
      where.layer = filters.layer;
    }
    if (filters?.parentCode) {
      where.parentCode = filters.parentCode;
    } else if (filters?.parentCode === null) {
      where.parentCode = IsNull();
    }
    if (filters?.isActive !== undefined && filters?.isActive !== null) {
      where.isActive = filters.isActive;
    }

    const [entities, total] = await this.categoryRepository.findAndCount({
      where,
      order: { sortOrder: 'ASC' },
      skip,
      take,
    });

    return {
      data: entities.map((entity) => CategoryMapper.toDomain(entity)),
      total,
    };
  }

  async findById(id: Category['id']): Promise<NullableType<Category>> {
    const entity = await this.categoryRepository.findOne({
      where: { id },
    });
    return entity ? CategoryMapper.toDomain(entity) : null;
  }

  async findByCode(code: string): Promise<NullableType<Category>> {
    const entity = await this.categoryRepository.findOne({
      where: { code },
    });
    return entity ? CategoryMapper.toDomain(entity) : null;
  }

  async findChildren(parentCode: string): Promise<Category[]> {
    const entities = await this.categoryRepository.find({
      where: { parentCode },
      order: { sortOrder: 'ASC' },
    });
    return entities.map((entity) => CategoryMapper.toDomain(entity));
  }

  async create(
    data: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Category> {
    const persistenceModel = CategoryMapper.toPersistence(data as Category);
    const newEntity = await this.categoryRepository.save(
      this.categoryRepository.create(persistenceModel),
    );
    return CategoryMapper.toDomain(newEntity);
  }

  async update(
    id: Category['id'],
    data: Partial<Omit<Category, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<Category | null> {
    const entity = await this.categoryRepository.findOne({ where: { id } });
    if (!entity) {
      return null;
    }

    Object.assign(entity, data);
    const updated = await this.categoryRepository.save(entity);
    return CategoryMapper.toDomain(updated);
  }

  async delete(id: Category['id']): Promise<void> {
    await this.categoryRepository.delete(id);
  }

  async hasContent(id: Category['id']): Promise<boolean> {
    const count = await this.contentItemRepository.count({
      where: { categoryId: id },
    });
    return count > 0;
  }
}
