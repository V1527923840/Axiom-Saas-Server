import { NullableType } from '../../../utils/types/nullable.type';
import { Category } from '../../domain/category';

export abstract class CategoryRepository {
  abstract findAll(filters?: {
    layer?: string | null;
    parentCode?: string | null;
    isActive?: boolean | null;
  }): Promise<Category[]>;

  abstract findById(id: Category['id']): Promise<NullableType<Category>>;

  abstract findByCode(code: string): Promise<NullableType<Category>>;

  abstract findChildren(parentCode: string): Promise<Category[]>;

  abstract create(
    data: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Category>;

  abstract update(
    id: Category['id'],
    data: Partial<Omit<Category, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<Category | null>;

  abstract delete(id: Category['id']): Promise<void>;

  abstract hasContent(id: Category['id']): Promise<boolean>;
}
