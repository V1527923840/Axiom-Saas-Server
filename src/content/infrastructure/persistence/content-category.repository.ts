import { NullableType } from '../../../utils/types/nullable.type';
import { ContentCategory } from '../../domain/content-category';

export abstract class ContentCategoryRepository {
  abstract findAll(): Promise<ContentCategory[]>;

  abstract findById(
    id: ContentCategory['id'],
  ): Promise<NullableType<ContentCategory>>;

  abstract findByCode(code: string): Promise<NullableType<ContentCategory>>;

  abstract create(
    data: Omit<ContentCategory, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<ContentCategory>;
}
