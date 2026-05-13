import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { EtlJobEntity } from '../entities/etl-job.entity';
import { EtlJobMapper } from '../mappers/etl-job.mapper';
import { EtlJobRepository } from 'src/etl/infrastructure/persistence/etl-job.repository';
import { EtlJob } from 'src/etl/domain/etl-job';
import { NullableType } from 'src/utils/types/nullable.type';

@Injectable()
export class EtlJobRelationalRepository implements EtlJobRepository {
  constructor(
    @InjectRepository(EtlJobEntity)
    private readonly etlJobRepository: Repository<EtlJobEntity>,
  ) {}

  async create(
    data: Omit<EtlJob, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<EtlJob> {
    const persistenceModel = EtlJobMapper.toPersistence(data as EtlJob);
    const newEntity = await this.etlJobRepository.save(
      this.etlJobRepository.create(persistenceModel),
    );
    return EtlJobMapper.toDomain(newEntity);
  }

  async findById(id: EtlJob['id']): Promise<NullableType<EtlJob>> {
    const entity = await this.etlJobRepository.findOne({
      where: { id },
    });
    return entity ? EtlJobMapper.toDomain(entity) : null;
  }

  async findManyWithPagination({
    page,
    limit,
    status,
    dateFrom,
    dateTo,
  }: {
    page: number;
    limit: number;
    status?: string | null;
    dateFrom?: Date | null;
    dateTo?: Date | null;
  }): Promise<{ data: EtlJob[]; total: number }> {
    const where: Record<string, any> = {};

    if (status) {
      where.status = status;
    }

    if (dateFrom && dateTo) {
      where.createdAt = Between(dateFrom, dateTo);
    } else if (dateFrom) {
      where.createdAt = MoreThanOrEqual(dateFrom);
    } else if (dateTo) {
      where.createdAt = LessThanOrEqual(dateTo);
    }

    const [entities, total] = await this.etlJobRepository.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      data: entities.map((entity) => EtlJobMapper.toDomain(entity)),
      total,
    };
  }

  async update(
    id: EtlJob['id'],
    data: Partial<Omit<EtlJob, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<EtlJob | null> {
    const entity = await this.etlJobRepository.findOne({ where: { id } });
    if (!entity) {
      return null;
    }

    Object.assign(entity, data);
    const updated = await this.etlJobRepository.save(entity);
    return EtlJobMapper.toDomain(updated);
  }

  async updateStatus(
    id: EtlJob['id'],
    status: string,
    extra?: Partial<{
      totalItems: number;
      successItems: number;
      failedItems: number;
      errorMessage: string;
      startedAt: Date;
      completedAt: Date;
    }>,
  ): Promise<void> {
    const updateData: Record<string, any> = { status };
    if (extra) {
      Object.assign(updateData, extra);
    }
    await this.etlJobRepository.update(id, updateData);
  }
}
