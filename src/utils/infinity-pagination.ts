import { IPaginationOptions } from './types/pagination-options';
import { PaginatedApiResponseDto } from './dto/api-response.dto';

export interface IPaginatedData<T> {
  data: T[];
  total: number;
}

export const infinityPagination = <T>(
  data: T[],
  options: IPaginationOptions,
  total?: number,
): { data: T[]; hasNextPage: boolean } | PaginatedApiResponseDto<T> => {
  if (total !== undefined) {
    return {
      data,
      total,
      page: options.page,
      pageSize: options.limit,
    };
  }
  return {
    data,
    hasNextPage: data.length === options.limit,
  };
};
