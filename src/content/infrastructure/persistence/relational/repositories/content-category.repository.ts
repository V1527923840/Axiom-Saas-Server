import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContentCategoryEntity } from '../entities/content-category.entity';
import { ContentCategoryMapper } from '../mappers/content-category.mapper';
import { ContentCategoryRepository } from '../../content-category.repository';
import { ContentCategory } from '../../../../domain/content-category';
import { NullableType } from '../../../../../utils/types/nullable.type';

@Injectable()
export class ContentCategoryRelationalRepository implements ContentCategoryRepository {
  constructor(
    @InjectRepository(ContentCategoryEntity)
    private readonly categoryRepository: Repository<ContentCategoryEntity>,
  ) {}

  async findAll(): Promise<ContentCategory[]> {
    const entities = await this.categoryRepository.find({
      order: { sortOrder: 'ASC' },
    });
    return entities.map((entity) => ContentCategoryMapper.toDomain(entity));
  }

  async findById(
    id: ContentCategory['id'],
  ): Promise<NullableType<ContentCategory>> {
    const entity = await this.categoryRepository.findOne({
      where: { id },
    });
    return entity ? ContentCategoryMapper.toDomain(entity) : null;
  }

  async findByCode(code: string): Promise<NullableType<ContentCategory>> {
    const entity = await this.categoryRepository.findOne({
      where: { code },
    });
    return entity ? ContentCategoryMapper.toDomain(entity) : null;
  }

  async create(
    data: Omit<ContentCategory, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<ContentCategory> {
    const persistenceModel = ContentCategoryMapper.toPersistence(
      data as ContentCategory,
    );
    const newEntity = await this.categoryRepository.save(
      this.categoryRepository.create(persistenceModel),
    );
    return ContentCategoryMapper.toDomain(newEntity);
  }
}
