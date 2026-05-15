import { Injectable } from '@nestjs/common';
import { ScrapeLogRepository } from './infrastructure/persistence/scrape-log.repository';
import { ScrapeLog } from './domain/scrape-log';
import { IPaginationOptions } from '../utils/types/pagination-options';

@Injectable()
export class ScrapeLogService {
  constructor(private readonly scrapeLogRepository: ScrapeLogRepository) {}

  findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<{ data: ScrapeLog[]; total: number }> {
    return this.scrapeLogRepository.findManyWithPagination({
      paginationOptions,
    });
  }

  findById(id: ScrapeLog['id']): Promise<ScrapeLog | null> {
    return this.scrapeLogRepository.findById(id);
  }
}
