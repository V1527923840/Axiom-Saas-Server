// src/utils/interceptors/transform-response.interceptor.ts
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface EnvelopeResponse<T> {
  data: T;
  meta?: { total: number; page: number; pageSize: number };
  message?: string;
}

/**
 * Internal paginated shape produced by controllers and `infinityPagination`.
 * Accepts both the legacy `limit` field and the current `pageSize` field so
 * the envelope is normalized regardless of which naming is in flight.
 */
interface PaginatedPayload<T> {
  data: T[];
  total: number;
  page: number;
  pageSize?: number;
  limit?: number;
}

interface AlreadyEnvelopedPayload {
  data: unknown;
  message?: string;
  [key: string]: unknown;
}

function isPaginated(value: unknown): value is PaginatedPayload<unknown> {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    Array.isArray(v.data) &&
    typeof v.total === 'number' &&
    typeof v.page === 'number' &&
    (typeof v.pageSize === 'number' || typeof v.limit === 'number')
  );
}

function isAlreadyEnveloped(value: unknown): value is AlreadyEnvelopedPayload {
  if (typeof value !== 'object' || value === null) return false;
  return 'data' in (value as Record<string, unknown>);
}

@Injectable()
export class TransformResponseInterceptor<T> implements NestInterceptor<
  T,
  EnvelopeResponse<T>
> {
  intercept(
    _: ExecutionContext,
    next: CallHandler,
  ): Observable<EnvelopeResponse<T>> {
    return next.handle().pipe(
      map((payload: unknown) => {
        if (payload === null || payload === undefined) {
          return { data: payload as T };
        }
        if (isPaginated(payload)) {
          // Prefer the new `pageSize` field; fall back to legacy `limit`.
          const pageSize =
            typeof payload.pageSize === 'number'
              ? payload.pageSize
              : (payload.limit as number);
          return {
            data: payload.data as T,
            meta: {
              total: payload.total,
              page: payload.page,
              pageSize,
            },
          };
        }
        if (isAlreadyEnveloped(payload)) {
          // Pass through { data, message } shapes (controllers that
          // explicitly return a message alongside data). Any unknown
          // sibling keys are intentionally dropped — the envelope is
          // the contract.
          return {
            data: payload.data as T,
            message: payload.message,
          };
        }
        return { data: payload as T };
      }),
    );
  }
}
