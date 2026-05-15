import { NullableType } from '../../../utils/types/nullable.type';
import { ScrapeLog } from '../../domain/scrape-log';
import { IPaginationOptions } from '../../../utils/types/pagination-options';

export abstract class ScrapeLogRepository {
  abstract create(
    data: Omit<ScrapeLog, 'id' | 'createdat' | 'updatedat'>,
  ): Promise<ScrapeLog>;

  abstract findManyWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<{ data: ScrapeLog[]; total: number }>;

  abstract findById(id: ScrapeLog['id']): Promise<NullableType<ScrapeLog>>;

  abstract update(
    id: ScrapeLog['id'],
    payload: Partial<ScrapeLog>,
  ): Promise<ScrapeLog | null>;
}
