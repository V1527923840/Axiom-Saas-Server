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

interface PaginatedPayload<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
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
    typeof v.limit === 'number'
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
          return {
            data: payload.data as T,
            meta: {
              total: payload.total,
              page: payload.page,
              pageSize: payload.limit,
            },
          };
        }
        if (isAlreadyEnveloped(payload)) {
          // Pass through { data, message } shapes (controllers that explicitly return message).
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
