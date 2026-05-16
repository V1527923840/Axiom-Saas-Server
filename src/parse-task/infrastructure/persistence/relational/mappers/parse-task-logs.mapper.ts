import { ParseTask } from '../../../../domain/parse-task';
import { ParseTaskLogsEntity } from '../entities/parse-task-logs.entity';

export class ParseTaskLogsMapper {
  static toDomain(entity: ParseTaskLogsEntity): ParseTask {
    return {
      id: entity.id,
      scrapeLogId: entity.scrape_log_id,
      source: entity.source,
      version: entity.version,
      sourceFileKey: entity.source_file_key,
      sourceFilename: entity.source_filename,
      outputJsonKey: entity.output_json_key,
      outputMdKey: entity.output_md_key,
      status: entity.status as ParseTask['status'],
      errorMessage: entity.error_message,
      retryCount: entity.retry_count,
      parser: entity.parser,
      parseDurationMs: entity.parse_duration_ms
        ? Number(entity.parse_duration_ms)
        : null,
      startedAt: entity.started_at,
      completedAt: entity.completed_at,
      createdAt: entity.created_at,
      updatedAt: entity.updated_at,
      metadata: entity.metadata ?? {},
    };
  }

  static toPersistence(
    domain: Omit<ParseTask, 'id' | 'createdAt' | 'updatedAt'>,
  ): Partial<ParseTaskLogsEntity> {
    return {
      scrape_log_id: domain.scrapeLogId,
      source: domain.source,
      version: domain.version,
      source_file_key: domain.sourceFileKey,
      source_filename: domain.sourceFilename,
      output_json_key: domain.outputJsonKey,
      output_md_key: domain.outputMdKey,
      status: domain.status,
      error_message: domain.errorMessage,
      retry_count: domain.retryCount,
      parser: domain.parser,
      parse_duration_ms: domain.parseDurationMs,
      started_at: domain.startedAt,
      completed_at: domain.completedAt,
      metadata: domain.metadata ?? {},
    };
  }
}
