import { Type } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

// Re-export InfinityPaginationResponseDto and PaginatedApiResponseDto from api-response.dto
export {
  InfinityPaginationResponseDto,
  PaginatedApiResponseDto,
} from './api-response.dto';

export function InfinityPaginationResponse<T>(classReference: Type<T>) {
  abstract class Pagination {
    @ApiProperty({ type: [classReference] })
    data!: T[];

    @ApiProperty({
      type: Boolean,
      example: true,
    })
    hasNextPage: boolean;
  }

  Object.defineProperty(Pagination, 'name', {
    writable: false,
    value: `InfinityPagination${classReference.name}ResponseDto`,
  });

  return Pagination;
}
