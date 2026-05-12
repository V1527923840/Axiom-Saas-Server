import { NullableType } from '../../../utils/types/nullable.type';
import { ContentItem } from '../../domain/content-item';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { FilterContentDto, SortContentDto } from '../../dto/query-content.dto';

export abstract class ContentItemRepository {
  abstract findManyWithPagination({
    categoryId,
    filterOptions,
    sortOptions,
    paginationOptions,
  }: {
    categoryId: string;
    filterOptions?: FilterContentDto | null;
    sortOptions?: SortContentDto[] | null;
    paginationOptions: IPaginationOptions;
  }): Promise<ContentItem[]>;

  abstract findById(id: ContentItem['id']): Promise<NullableType<ContentItem>>;

  abstract create(
    data: Omit<ContentItem, 'id' | 'createdAt' | 'updatedAt' | 'collectedAt'>,
  ): Promise<ContentItem>;

  abstract softDelete(id: ContentItem['id']): Promise<void>;
}
