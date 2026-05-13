import { NullableType } from 'src/utils/types/nullable.type';
import { EtlJob } from 'src/etl/domain/etl-job';

export abstract class EtlJobRepository {
  abstract create(
    data: Omit<EtlJob, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<EtlJob>;

  abstract findById(id: EtlJob['id']): Promise<NullableType<EtlJob>>;

  abstract findManyWithPagination({
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
  }): Promise<{ data: EtlJob[]; total: number }>;

  abstract update(
    id: EtlJob['id'],
    data: Partial<Omit<EtlJob, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<EtlJob | null>;

  abstract updateStatus(
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
  ): Promise<void>;
}
