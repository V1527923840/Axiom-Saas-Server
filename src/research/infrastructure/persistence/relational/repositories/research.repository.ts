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
import { ResearchAnalysisEntity } from '../entities/research-analysis.entity';
import { ResearchAnalysisMapper } from '../mappers/research-analysis.mapper';
import { ResearchRepository } from '../../research.repository';
import { ResearchAnalysis } from '../../../../domain/research';
import { IPaginationOptions } from '../../../../domain/../../utils/types/pagination-options';
import { QueryResearchDto } from '../../../../dto/query-research.dto';

@Injectable()
export class ResearchRelationalRepository implements ResearchRepository {
  constructor(
    @InjectRepository(ResearchAnalysisEntity)
    private readonly repository: Repository<ResearchAnalysisEntity>,
  ) {}

  async findManyWithPagination({
    filterOptions,
    paginationOptions,
  }: {
    filterOptions?: QueryResearchDto;
    paginationOptions: IPaginationOptions;
  }): Promise<ResearchAnalysis[]> {
    const where = this.buildWhereClause(filterOptions);

    const entities = await this.repository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
      where,
      order: this.buildOrderClause(filterOptions),
    });

    return entities.map((entity) => ResearchAnalysisMapper.toDomain(entity));
  }

  async countWithFilters({
    filterOptions,
  }: {
    filterOptions?: QueryResearchDto;
  }): Promise<number> {
    const where = this.buildWhereClause(filterOptions);
    return this.repository.count({ where });
  }

  async findById(id: number): Promise<ResearchAnalysis | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? ResearchAnalysisMapper.toDomain(entity) : null;
  }

  private buildWhereClause(
    filterOptions?: QueryResearchDto,
  ): FindOptionsWhere<ResearchAnalysisEntity> {
    const where: FindOptionsWhere<ResearchAnalysisEntity> = {};

    if (filterOptions?.categoryL1) {
      where.categoryL1 = filterOptions.categoryL1;
    }

    if (filterOptions?.categoryL2) {
      where.categoryL2 = filterOptions.categoryL2;
    }

    if (filterOptions?.valueRating) {
      where.valueRating = filterOptions.valueRating;
    }

    if (filterOptions?.keyword) {
      where.documentName = ILike(`%${filterOptions.keyword}%`);
    }

    if (filterOptions?.dateFrom && filterOptions?.dateTo) {
      where.analyzedAt = Between(
        new Date(filterOptions.dateFrom),
        new Date(filterOptions.dateTo),
      );
    } else if (filterOptions?.dateFrom) {
      where.analyzedAt = MoreThanOrEqual(new Date(filterOptions.dateFrom));
    } else if (filterOptions?.dateTo) {
      where.analyzedAt = LessThanOrEqual(new Date(filterOptions.dateTo));
    }

    return where;
  }

  private buildOrderClause(
    filterOptions?: QueryResearchDto,
  ): Record<string, 'ASC' | 'DESC'> {
    const sortBy = filterOptions?.sortBy || 'createdAt';
    const sortOrder = filterOptions?.sortOrder || 'desc';

    const fieldMapping: Record<string, string> = {
      analyzedAt: 'analyzedAt',
      overallScore: 'overallScore',
      createdAt: 'createdAt',
    };

    return {
      [fieldMapping[sortBy] || 'createdAt']: sortOrder.toUpperCase() as
        | 'ASC'
        | 'DESC',
    };
  }
}
