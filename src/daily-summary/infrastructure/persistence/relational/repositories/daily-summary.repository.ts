import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  FindOptionsWhere,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { DailySummaryEntity } from '../entities/daily-summary.entity';
import { DailySummaryMapper } from '../mappers/daily-summary.mapper';
import {
  DailySummaryFilterOptions,
  DailySummaryPaginationOptions,
  DailySummaryRepository,
} from '../../daily-summary.repository';
import { DailySummary } from '../../../../domain/daily-summary';
import { NullableType } from '../../../../../utils/types/nullable.type';

@Injectable()
export class DailySummaryRelationalRepository implements DailySummaryRepository {
  constructor(
    @InjectRepository(DailySummaryEntity)
    private readonly dailySummaryRepository: Repository<DailySummaryEntity>,
  ) {}

  async findLatest(frequency: string): Promise<NullableType<DailySummary>> {
    const entity = await this.dailySummaryRepository.findOne({
      where: { frequency, isLatest: true },
      order: { reportDate: 'DESC', revision: 'DESC' },
    });
    return entity ? DailySummaryMapper.toDomain(entity) : null;
  }

  async findById(reportId: string): Promise<NullableType<DailySummary>> {
    const entity = await this.dailySummaryRepository.findOne({
      where: { reportId },
    });
    return entity ? DailySummaryMapper.toDomain(entity) : null;
  }

  async findManyWithPagination({
    filterOptions,
    paginationOptions,
  }: {
    filterOptions?: DailySummaryFilterOptions | null;
    paginationOptions: DailySummaryPaginationOptions;
  }): Promise<[DailySummary[], number]> {
    const where: FindOptionsWhere<DailySummaryEntity> = {};

    if (filterOptions?.frequency) {
      where.frequency = filterOptions.frequency;
    }

    if (filterOptions?.dateFrom && filterOptions?.dateTo) {
      // report_date is stored as `varchar` — ISO date strings sort
      // lexicographically, so a string `Between` is correct.
      where.reportDate = Between(filterOptions.dateFrom, filterOptions.dateTo);
    } else if (filterOptions?.dateFrom) {
      where.reportDate = MoreThanOrEqual(filterOptions.dateFrom);
    } else if (filterOptions?.dateTo) {
      where.reportDate = LessThanOrEqual(filterOptions.dateTo);
    }

    const [entities, total] = await this.dailySummaryRepository.findAndCount({
      where,
      order: { reportDate: 'DESC', revision: 'DESC' },
      // page 是 0-based，见 DailySummaryPaginationOptions 的说明
      skip: paginationOptions.page * paginationOptions.pageSize,
      take: paginationOptions.pageSize,
    });

    return [
      entities.map((entity) => DailySummaryMapper.toDomain(entity)),
      total,
    ];
  }
}
