import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ParseTaskLogsEntity } from '../entities/parse-task-logs.entity';
import { ParseTaskRepository } from '../../parse-task.repository';
import { ParseTask } from '../../../../domain/parse-task';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { ParseTaskLogsMapper } from '../mappers/parse-task-logs.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class ParseTaskLogsRelationalRepository implements ParseTaskRepository {
  constructor(
    @InjectRepository(ParseTaskLogsEntity)
    private readonly repository: Repository<ParseTaskLogsEntity>,
  ) {}

  async create(
    data: Omit<ParseTask, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<ParseTask> {
    const persistenceModel = ParseTaskLogsMapper.toPersistence(data);
    const newEntity = await this.repository.save(
      this.repository.create(persistenceModel),
    );
    return ParseTaskLogsMapper.toDomain(newEntity);
  }

  async findManyWithPagination({
    paginationOptions,
    filterOptions,
  }: {
    paginationOptions: IPaginationOptions;
    filterOptions?: {
      source?: string;
      status?: string;
    };
  }): Promise<{ data: ParseTask[]; total: number }> {
    const queryBuilder = this.repository.createQueryBuilder('task');

    if (filterOptions?.source) {
      queryBuilder.andWhere('task.source = :source', {
        source: filterOptions.source,
      });
    }

    if (filterOptions?.status) {
      queryBuilder.andWhere('task.status = :status', {
        status: filterOptions.status,
      });
    }

    const [entities, total] = await queryBuilder
      .orderBy('task.created_at', 'DESC')
      .skip((paginationOptions.page - 1) * paginationOptions.limit)
      .take(paginationOptions.limit)
      .getManyAndCount();

    return {
      data: entities.map((entity) => ParseTaskLogsMapper.toDomain(entity)),
      total,
    };
  }

  async findById(id: ParseTask['id']): Promise<NullableType<ParseTask>> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? ParseTaskLogsMapper.toDomain(entity) : null;
  }

  async update(
    id: ParseTask['id'],
    payload: Partial<ParseTask>,
  ): Promise<ParseTask | null> {
    const entity = await this.repository.findOne({ where: { id } });
    if (!entity) return null;

    const updateData: Partial<ParseTaskLogsEntity> = {};

    // Only update provided fields
    if (payload.source !== undefined) updateData.source = payload.source;
    if (payload.version !== undefined) updateData.version = payload.version;
    if (payload.sourceFileKey !== undefined)
      updateData.source_file_key = payload.sourceFileKey;
    if (payload.sourceFilename !== undefined)
      updateData.source_filename = payload.sourceFilename;
    if (payload.outputJsonKey !== undefined)
      updateData.output_json_key = payload.outputJsonKey;
    if (payload.outputMdKey !== undefined)
      updateData.output_md_key = payload.outputMdKey;
    if (payload.status !== undefined) updateData.status = payload.status;
    if (payload.errorMessage !== undefined)
      updateData.error_message = payload.errorMessage;
    if (payload.retryCount !== undefined)
      updateData.retry_count = payload.retryCount;
    if (payload.parser !== undefined) updateData.parser = payload.parser;
    if (payload.parseDurationMs !== undefined)
      updateData.parse_duration_ms = payload.parseDurationMs;
    if (payload.startedAt !== undefined)
      updateData.started_at = payload.startedAt;
    if (payload.completedAt !== undefined)
      updateData.completed_at = payload.completedAt;
    if (payload.metadata !== undefined)
      updateData.metadata = payload.metadata ?? {};

    Object.assign(entity, updateData);
    const updatedEntity = await this.repository.save(entity);
    return ParseTaskLogsMapper.toDomain(updatedEntity);
  }

  async delete(id: ParseTask['id']): Promise<void> {
    await this.repository.delete(id);
  }
}
