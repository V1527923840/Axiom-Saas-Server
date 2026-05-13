import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EtlJobRepository } from './infrastructure/persistence/etl-job.repository';
import { EtlProcessor, EtlProcessorResult } from './etl.processor';
import { EtlJobStatus } from './domain/etl-job';
import {
  ImportRequestDto,
  JobStatusDto,
  JobListQueryDto,
  ScanFileDto,
} from './dto/etl.dto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class EtlService {
  private readonly logger = new Logger(EtlService.name);
  private readonly OUTPUT_DIR = 'output_v2';

  constructor(
    private readonly etlJobRepository: EtlJobRepository,
    private readonly etlProcessor: EtlProcessor,
  ) {}

  async scanFiles(): Promise<{ data: ScanFileDto[]; total: number }> {
    const files = await this.scanOutputDirectory();
    return {
      data: files,
      total: files.length,
    };
  }

  async importFiles(request: ImportRequestDto): Promise<{
    jobId: string;
    status: string;
    estimatedItems: number;
    startedAt: string;
  }> {
    const dryRun = request.options?.dryRun ?? false;

    // For now, process first file only (can be extended to multiple)
    const file = request.files[0];
    const filePath = path.join(this.OUTPUT_DIR, file);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException({
        status: 404,
        message: `File not found: ${file}`,
      });
    }

    // Parse file to get entry count
    let estimatedItems = 0;
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);
      estimatedItems = data.entries?.length || 1;
    } catch {
      estimatedItems = 1;
    }

    // Create ETL job
    const job = await this.etlJobRepository.create({
      sourceFile: file,
      parser: this.detectParser(file),
      totalItems: estimatedItems,
      successItems: 0,
      failedItems: 0,
      status: EtlJobStatus.PROCESSING,
      startedAt: new Date(),
    });

    // Process in background (fire and forget)
    void this.processFileAsync(job.id, filePath, dryRun);

    return {
      jobId: job.id,
      status: job.status,
      estimatedItems,
      startedAt: job.startedAt?.toISOString() || new Date().toISOString(),
    };
  }

  async getJobStatus(jobId: string): Promise<JobStatusDto> {
    const job = await this.etlJobRepository.findById(jobId);
    if (!job) {
      throw new NotFoundException({
        status: 404,
        message: 'Job not found',
      });
    }

    return {
      id: job.id,
      sourceFile: job.sourceFile,
      parser: job.parser,
      totalItems: job.totalItems,
      successItems: job.successItems,
      failedItems: job.failedItems,
      status: job.status,
      errorMessage: job.errorMessage,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      createdAt: job.createdAt,
    };
  }

  async getJobHistory(query: JobListQueryDto): Promise<{
    data: JobStatusDto[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const page = query.page ?? 1;
    let pageSize = query.pageSize ?? 20;
    if (pageSize > 100) {
      pageSize = 100;
    }

    const dateFrom = query.dateFrom ? new Date(query.dateFrom) : null;
    const dateTo = query.dateTo ? new Date(query.dateTo) : null;

    const result = await this.etlJobRepository.findManyWithPagination({
      page,
      limit: pageSize,
      status: query.status ?? null,
      dateFrom,
      dateTo,
    });

    return {
      data: result.data.map((job) => ({
        id: job.id,
        sourceFile: job.sourceFile,
        parser: job.parser,
        totalItems: job.totalItems,
        successItems: job.successItems,
        failedItems: job.failedItems,
        status: job.status,
        errorMessage: job.errorMessage,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        createdAt: job.createdAt,
      })),
      total: result.total,
      page,
      pageSize,
    };
  }

  private scanOutputDirectory(): ScanFileDto[] {
    const files: ScanFileDto[] = [];

    // Check if directory exists
    if (!fs.existsSync(this.OUTPUT_DIR)) {
      this.logger.warn(`Output directory does not exist: ${this.OUTPUT_DIR}`);
      return files;
    }

    const entries = fs.readdirSync(this.OUTPUT_DIR);
    for (const filename of entries) {
      if (!filename.endsWith('_extracted.json')) {
        continue;
      }

      const filePath = path.join(this.OUTPUT_DIR, filename);
      const stats = fs.statSync(filePath);

      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(content);

        files.push({
          filename,
          parser: data.parser || 'unknown',
          entryCount: data.entries?.length || 1,
          size: stats.size,
          modifiedAt: stats.mtime.toISOString(),
        });
      } catch {
        files.push({
          filename,
          parser: 'unknown',
          entryCount: 0,
          size: stats.size,
          modifiedAt: stats.mtime.toISOString(),
        });
      }
    }

    return files;
  }

  private detectParser(filename: string): string {
    if (filename.includes('zsxq')) {
      return 'zsxq_parser';
    }
    if (filename.includes('research_report') || filename.includes('研报')) {
      return 'research_report_parser';
    }
    if (filename.includes('audio') || filename.includes('会议')) {
      return 'audio_parser';
    }
    return 'unknown';
  }

  private async processFileAsync(
    jobId: string,
    filePath: string,
    dryRun: boolean,
  ): Promise<void> {
    try {
      const result: EtlProcessorResult = await this.etlProcessor.processFile(
        filePath,
        dryRun,
      );

      await this.etlJobRepository.updateStatus(jobId, EtlJobStatus.COMPLETED, {
        totalItems: result.success + result.failed,
        successItems: result.success,
        failedItems: result.failed,
        completedAt: new Date(),
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      await this.etlJobRepository.updateStatus(jobId, EtlJobStatus.FAILED, {
        errorMessage,
        completedAt: new Date(),
      });
    }
  }
}
