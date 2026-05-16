import { NullableType } from '../../../utils/types/nullable.type';
import { ParseTask } from '../../domain/parse-task';
import { IPaginationOptions } from '../../../utils/types/pagination-options';

export abstract class ParseTaskRepository {
  abstract create(
    data: Omit<ParseTask, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<ParseTask>;

  abstract findManyWithPagination({
    paginationOptions,
    filterOptions,
  }: {
    paginationOptions: IPaginationOptions;
    filterOptions?: {
      source?: string;
      status?: string;
    };
  }): Promise<{ data: ParseTask[]; total: number }>;

  abstract findById(id: ParseTask['id']): Promise<NullableType<ParseTask>>;

  abstract update(
    id: ParseTask['id'],
    payload: Partial<ParseTask>,
  ): Promise<ParseTask | null>;

  abstract delete(id: ParseTask['id']): Promise<void>;
}
