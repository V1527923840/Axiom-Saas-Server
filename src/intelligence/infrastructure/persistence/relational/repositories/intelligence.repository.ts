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
import { IntelligenceClassificationEntity } from '../entities/intelligence-classification.entity';
import { IntelligenceClassificationMapper } from '../mappers/intelligence-classification.mapper';
import { IntelligenceRepository } from '../../intelligence.repository';
import { Intelligence } from '../../../../domain/intelligence';
import { IPaginationOptions } from '../../../../domain/../../utils/types/pagination-options';
import { QueryIntelligenceDto } from '../../../../dto/query-intelligence.dto';

@Injectable()
export class IntelligenceRelationalRepository implements IntelligenceRepository {
  constructor(
    @InjectRepository(IntelligenceClassificationEntity)
    private readonly repository: Repository<IntelligenceClassificationEntity>,
  ) {}

  async findManyWithPagination({
    filterOptions,
    paginationOptions,
  }: {
    filterOptions?: QueryIntelligenceDto;
    paginationOptions: IPaginationOptions;
  }): Promise<Intelligence[]> {
    const where = this.buildWhereClause(filterOptions);

    const entities = await this.repository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
      where,
      order: this.buildOrderClause(filterOptions),
    });

    return entities.map((entity) =>
      IntelligenceClassificationMapper.toDomain(entity),
    );
  }

  async countWithFilters({
    filterOptions,
  }: {
    filterOptions?: QueryIntelligenceDto;
  }): Promise<number> {
    const where = this.buildWhereClause(filterOptions);
    return this.repository.count({ where });
  }

  async findById(id: Intelligence['id']): Promise<Intelligence | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? IntelligenceClassificationMapper.toDomain(entity) : null;
  }

  private buildWhereClause(
    filterOptions?: QueryIntelligenceDto,
  ): FindOptionsWhere<IntelligenceClassificationEntity> {
    const where: FindOptionsWhere<IntelligenceClassificationEntity> = {};

    if (filterOptions?.categoryL1) {
      where.categoryL1 = filterOptions.categoryL1;
    }

    if (filterOptions?.categoryL2) {
      where.categoryL2 = filterOptions.categoryL2;
    }

    if (filterOptions?.valueRating) {
      where.valueRating = filterOptions.valueRating;
    }

    if (filterOptions?.company) {
      // Search in stock_mapping JSONB for mentioned stocks
      where.stockMapping = ILike(`%${filterOptions.company}%`);
    }

    if (filterOptions?.keyword) {
      // Search in title and original_text
      where.title = ILike(`%${filterOptions.keyword}%`);
    }

    if (filterOptions?.dateFrom && filterOptions?.dateTo) {
      where.postDate = Between(
        new Date(filterOptions.dateFrom),
        new Date(filterOptions.dateTo),
      );
    } else if (filterOptions?.dateFrom) {
      where.postDate = MoreThanOrEqual(new Date(filterOptions.dateFrom));
    } else if (filterOptions?.dateTo) {
      where.postDate = LessThanOrEqual(new Date(filterOptions.dateTo));
    }

    return where;
  }

  private buildOrderClause(
    filterOptions?: QueryIntelligenceDto,
  ): Record<string, 'ASC' | 'DESC'> {
    const sortBy = filterOptions?.sortBy || 'createdAt';
    const sortOrder = filterOptions?.sortOrder || 'desc';

    const fieldMapping: Record<string, string> = {
      postDate: 'postDate',
      createdAt: 'createdAt',
      totalScore: 'totalScore',
    };

    return {
      [fieldMapping[sortBy] || 'createdAt']: sortOrder.toUpperCase() as
        | 'ASC'
        | 'DESC',
    };
  }
}
