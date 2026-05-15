import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScrapeLogEntity } from '../entities/scrape-log.entity';
import { ScrapeLogRepository } from '../../scrape-log.repository';
import { ScrapeLog } from '../../../../domain/scrape-log';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { ScrapeLogMapper } from '../mappers/scrape-log.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class ScrapeLogRelationalRepository implements ScrapeLogRepository {
  constructor(
    @InjectRepository(ScrapeLogEntity)
    private readonly repository: Repository<ScrapeLogEntity>,
  ) {}

  async create(
    data: Omit<ScrapeLog, 'id' | 'createdat' | 'updatedat'>,
  ): Promise<ScrapeLog> {
    const persistenceModel = ScrapeLogMapper.toPersistence(data);
    const newEntity = await this.repository.save(
      this.repository.create(persistenceModel),
    );
    return ScrapeLogMapper.toDomain(newEntity);
  }

  async findManyWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<{ data: ScrapeLog[]; total: number }> {
    const [entities, total] = await this.repository.findAndCount({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
      order: { createdat: 'DESC' },
    });

    return {
      data: entities.map((entity) => ScrapeLogMapper.toDomain(entity)),
      total,
    };
  }

  async findById(id: ScrapeLog['id']): Promise<NullableType<ScrapeLog>> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? ScrapeLogMapper.toDomain(entity) : null;
  }

  async update(
    id: ScrapeLog['id'],
    payload: Partial<ScrapeLog>,
  ): Promise<ScrapeLog | null> {
    const entity = await this.repository.findOne({ where: { id } });
    if (!entity) return null;

    const updatedEntity = await this.repository.save(
      this.repository.create({
        ...entity,
        ...payload,
      }),
    );
    return ScrapeLogMapper.toDomain(updatedEntity);
  }
}
