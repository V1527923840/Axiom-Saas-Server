import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ParseTaskRepository } from './infrastructure/persistence/parse-task.repository';
import { ParseTask } from './domain/parse-task';
import { CreateParseTaskDto, ParseTaskQueryDto } from './dto/parse-task.dto';
import { ScrapeLogService } from '../scrape-log/scrape-log.service';
import { OssService } from '../oss/oss.service';
import { isValidStatusTransition } from '../db/parse-task-db';

@Injectable()
export class ParseTaskService {
  constructor(
    private readonly parseTaskRepository: ParseTaskRepository,
    private readonly scrapeLogService: ScrapeLogService,
    private readonly ossService: OssService,
  ) {}

  async findAll(
    query: ParseTaskQueryDto,
  ): Promise<{ data: ParseTask[]; total: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;

    return this.parseTaskRepository.findManyWithPagination({
      paginationOptions: { page, limit },
      filterOptions: {
        source: query.source,
        status: query.status,
      },
    });
  }

  async findById(id: string): Promise<ParseTask> {
    const task = await this.parseTaskRepository.findById(id);
    if (!task) {
      throw new NotFoundException(`Parse task with ID ${id} not found`);
    }
    return task;
  }

  async create(dto: CreateParseTaskDto): Promise<ParseTask> {
    // If sourceFileKey not provided, build it from source, version, and filename
    let sourceFileKey = dto.sourceFileKey;

    // Find the scrape log for this source/version
    const scrapeLogsResult = await this.scrapeLogService.findAllWithPagination({
      paginationOptions: { page: 1, limit: 1 },
    });

    // Look for scrape log with matching osspath
    const targetOsspath = `${dto.source}/${dto.version}`;
    const scrapeLog = scrapeLogsResult.data.find(
      (log) => log.osspath && log.osspath.startsWith(targetOsspath),
    );

    if (!scrapeLog) {
      // Try to find any scrape log with matching source
      const scrapeLogs = await this.findScrapeLogsBySource(dto.source);
      const matchingLog = scrapeLogs.find(
        (log) => log.osspath && log.osspath.includes(dto.version),
      );

      if (matchingLog && matchingLog.osspath) {
        sourceFileKey = matchingLog.osspath;
      } else {
        throw new BadRequestException(
          `No scrape log found for source=${dto.source}, version=${dto.version}`,
        );
      }
    } else if (scrapeLog.osspath) {
      sourceFileKey = scrapeLog.osspath;
    }

    // Extract filename from sourceFileKey
    const filename = (sourceFileKey || '').split('/').pop() || '';

    const taskData: Omit<ParseTask, 'id' | 'createdAt' | 'updatedAt'> = {
      scrapeLogId: scrapeLog?.id || '',
      source: dto.source,
      version: dto.version,
      sourceFileKey:
        sourceFileKey || `${dto.source}/${dto.version}/${filename}`,
      sourceFilename: filename || null,
      outputJsonKey: null,
      outputMdKey: null,
      status: 'pending',
      errorMessage: null,
      retryCount: 0,
      parser: null,
      parseDurationMs: null,
      startedAt: null,
      completedAt: null,
      metadata: {},
    };

    return this.parseTaskRepository.create(taskData);
  }

  async execute(id: string, parser?: string): Promise<ParseTask> {
    const task = await this.findById(id);

    if (!isValidStatusTransition(task.status, 'running')) {
      throw new BadRequestException(
        `Cannot transition from ${task.status} to running`,
      );
    }

    const startTime = new Date();

    // Update status to running
    const updatedTask = await this.parseTaskRepository.update(id, {
      status: 'running',
      startedAt: startTime,
      parser: parser || null,
    });

    if (!updatedTask) {
      throw new NotFoundException(`Parse task with ID ${id} not found`);
    }

    // In a real implementation, this would trigger the document extraction agent
    // For now, we just update the status and return
    // The actual execution would be handled by a background job/queue

    return updatedTask;
  }

  async delete(id: string): Promise<void> {
    // Verify task exists before deleting
    await this.findById(id);
    await this.parseTaskRepository.delete(id);
  }

  async updateStatus(
    id: string,
    status: ParseTask['status'],
    errorMessage?: string,
    outputPaths?: { jsonKey?: string; mdKey?: string },
  ): Promise<ParseTask> {
    const task = await this.findById(id);

    const updatePayload: Partial<ParseTask> = {
      status,
      errorMessage: errorMessage || null,
    };

    if (status === 'success' || status === 'failed' || status === 'partial') {
      updatePayload.completedAt = new Date();
    }

    if (outputPaths) {
      if (outputPaths.jsonKey) {
        updatePayload.outputJsonKey = outputPaths.jsonKey;
      }
      if (outputPaths.mdKey) {
        updatePayload.outputMdKey = outputPaths.mdKey;
      }
    }

    // Update parse duration if completed
    if (task.startedAt && updatePayload.completedAt) {
      updatePayload.parseDurationMs =
        updatePayload.completedAt.getTime() - task.startedAt.getTime();
    }

    const updatedTask = await this.parseTaskRepository.update(
      id,
      updatePayload,
    );
    if (!updatedTask) {
      throw new NotFoundException(`Parse task with ID ${id} not found`);
    }

    return updatedTask;
  }

  private async findScrapeLogsBySource(source: string): Promise<any[]> {
    // Find all scrape logs for a given source
    const result = await this.scrapeLogService.findAllWithPagination({
      paginationOptions: { page: 1, limit: 100 },
    });
    return result.data.filter((log) => log.source === source);
  }
}
