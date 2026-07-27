import { IPaginationOptions } from './types/pagination-options';
import { PaginatedApiResponseDto } from './dto/api-response.dto';

export interface IPaginatedData<T> {
  data: T[];
  total: number;
}

/** Returned when total is not provided — used for "infinite scroll" cursors. */
export interface InfinityPaginationResult<T> {
  data: T[];
  hasNextPage: boolean;
}

/**
 * Returns a paginated envelope `{ data, total, page, pageSize }` when
 * `total` is supplied; otherwise returns an `{ data, hasNextPage }`
 * cursor envelope (used by infinite-scroll callers).
 *
 * The two return types are discriminated so callers don't need a cast.
 */
export function infinityPagination<T>(
  data: T[],
  options: IPaginationOptions,
  total: number,
): PaginatedApiResponseDto<T>;
export function infinityPagination<T>(
  data: T[],
  options: IPaginationOptions,
): InfinityPaginationResult<T>;
export function infinityPagination<T>(
  data: T[],
  options: IPaginationOptions,
  total?: number,
): PaginatedApiResponseDto<T> | InfinityPaginationResult<T> {
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
}
