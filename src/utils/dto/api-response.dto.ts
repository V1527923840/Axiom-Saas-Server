import { Type } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiResponseDto<T> {
  @ApiPropertyOptional()
  data?: T;

  @ApiPropertyOptional()
  total?: number;

  @ApiPropertyOptional()
  page?: number;

  @ApiPropertyOptional()
  pageSize?: number;

  @ApiPropertyOptional()
  message?: string;

  @ApiPropertyOptional()
  code?: string;

  @ApiPropertyOptional()
  statusCode?: number;
}

export class InfinityPaginationResponseDto<T> {
  data: T[];
  hasNextPage: boolean;
}

export class PaginatedApiResponseDto<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export function SuccessApiResponse<T>(classReference: Type<T>) {
  abstract class SuccessResponse {
    @ApiProperty({ type: classReference })
    data: T;

    @ApiPropertyOptional()
    total?: number;

    @ApiPropertyOptional()
    page?: number;

    @ApiPropertyOptional()
    pageSize?: number;
  }

  Object.defineProperty(SuccessResponse, 'name', {
    writable: false,
    value: `Success${classReference.name}ResponseDto`,
  });

  return SuccessResponse;
}

export function PaginatedApiResponse<T>(classReference: Type<T>) {
  abstract class PaginatedResponse {
    @ApiProperty({ type: [classReference] })
    data: T[];

    @ApiProperty({ type: Number })
    total: number;

    @ApiProperty({ type: Number })
    page: number;

    @ApiProperty({ type: Number })
    pageSize: number;
  }

  Object.defineProperty(PaginatedResponse, 'name', {
    writable: false,
    value: `Paginated${classReference.name}ResponseDto`,
  });

  return PaginatedResponse;
}
