import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface SuccessResponse<T> {
  data: T;
  total?: number;
  page?: number;
  pageSize?: number;
}

@Injectable()
export class TransformResponseInterceptor<T> implements NestInterceptor<
  T,
  SuccessResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<SuccessResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        // Handle pagination response
        if (
          data &&
          typeof data === 'object' &&
          'data' in data &&
          Array.isArray((data as Record<string, unknown>).data)
        ) {
          const d = data as Record<string, unknown>;
          if ('total' in d && 'page' in d && 'pageSize' in d) {
            const result: SuccessResponse<T> = {
              data: d.data as T,
              total: d.total as number,
              page: d.page as number,
              pageSize: d.pageSize as number,
            };
            return result;
          }
        }

        // Always wrap non-paginated responses for frontend consistency
        const result: SuccessResponse<T> = { data: data as T };
        return result;
      }),
    );
  }
}
