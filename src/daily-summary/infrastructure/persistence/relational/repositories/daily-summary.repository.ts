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
    // daily 取最新 report_date；weekly 取最新 week_start（时间窗口起点）。
    // COALESCE 让同一条 query 覆盖两种频率：weekly 行 week_start 非空，
    // daily 行 week_start 为 null 时回退到 report_date。
    const entity = await this.dailySummaryRepository
      .createQueryBuilder('ds')
      .where('ds.frequency = :frequency', { frequency })
      .orderBy('COALESCE(ds.week_start, ds.report_date)', 'DESC')
      .limit(1)
      .getOne();
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
      // report_date is pg `date` (see 1791000000000). TypeORM binds the
      // driver string as a Date, but the column accepts ISO date
      // literals and the YYYY-MM-DD input passes through correctly.
      where.reportDate = Between(filterOptions.dateFrom, filterOptions.dateTo);
    } else if (filterOptions?.dateFrom) {
      where.reportDate = MoreThanOrEqual(filterOptions.dateFrom);
    } else if (filterOptions?.dateTo) {
      where.reportDate = LessThanOrEqual(filterOptions.dateTo);
    }

    const [entities, total] = await this.dailySummaryRepository.findAndCount({
      where,
      order: { reportDate: 'DESC' },
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
