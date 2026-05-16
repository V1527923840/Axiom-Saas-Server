import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CategoryRepository } from './infrastructure/persistence/category.repository';
import { Category } from './domain/category';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  QueryCategoryDto,
} from './dto/category.dto';
import { IPaginationOptions } from '../utils/types/pagination-options';

interface PaginationResult<T> {
  data: T[];
  total: number;
}

@Injectable()
export class CategoriesService {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  async findAllWithPagination({
    paginationOptions,
    filters,
  }: {
    paginationOptions: IPaginationOptions;
    filters: {
      layer?: string | null;
      parentCode?: string | null;
      isActive?: boolean | null;
    };
  }): Promise<PaginationResult<Category>> {
    const { page, limit } = paginationOptions;
    const skip = (page - 1) * limit;

    const result = await this.categoryRepository.findAllWithPagination({
      skip,
      take: limit,
      filters,
    });

    return {
      data: result.data,
      total: result.total,
    };
  }

  async findAll(
    query: QueryCategoryDto,
  ): Promise<{ data: Category[]; total: number }> {
    const filters = {
      layer: query.layer ?? null,
      parentCode: query.parentCode ?? null,
      isActive: query.isActive ?? null,
    };

    const categories = await this.categoryRepository.findAll(filters);
    return {
      data: categories,
      total: categories.length,
    };
  }

  async findById(id: string): Promise<Category> {
    const category = await this.categoryRepository.findById(id);
    if (!category) {
      throw new NotFoundException({
        status: 404,
        message: 'Category not found',
      });
    }
    return category;
  }

  async findChildren(id: string): Promise<Category[]> {
    const category = await this.categoryRepository.findById(id);
    if (!category) {
      throw new NotFoundException({
        status: 404,
        message: 'Category not found',
      });
    }
    return this.categoryRepository.findChildren(category.code);
  }

  async create(createDto: CreateCategoryDto): Promise<Category> {
    // Check if code already exists
    const existing = await this.categoryRepository.findByCode(createDto.code);
    if (existing) {
      throw new BadRequestException({
        status: 400,
        message: 'Category code already exists',
      });
    }

    // Validate parent code if provided
    if (createDto.parentCode) {
      const parent = await this.categoryRepository.findByCode(
        createDto.parentCode,
      );
      if (!parent) {
        throw new BadRequestException({
          status: 400,
          message: 'Parent category not found',
        });
      }
    }

    return this.categoryRepository.create({
      name: createDto.name,
      code: createDto.code,
      layer: createDto.layer,
      parentCode: createDto.parentCode ?? null,
      description: createDto.description ?? null,
      sortOrder: createDto.sortOrder ?? 0,
      isActive: createDto.isActive ?? true,
      metadata: {},
    });
  }

  async update(id: string, updateDto: UpdateCategoryDto): Promise<Category> {
    const category = await this.categoryRepository.findById(id);
    if (!category) {
      throw new NotFoundException({
        status: 404,
        message: 'Category not found',
      });
    }

    // Validate parent code if provided
    if (updateDto.parentCode) {
      const parent = await this.categoryRepository.findByCode(
        updateDto.parentCode,
      );
      if (!parent) {
        throw new BadRequestException({
          status: 400,
          message: 'Parent category not found',
        });
      }
      // Prevent circular reference
      if (parent.id === id) {
        throw new BadRequestException({
          status: 400,
          message: 'Category cannot be its own parent',
        });
      }
    }

    const updated = await this.categoryRepository.update(id, updateDto);
    if (!updated) {
      throw new NotFoundException({
        status: 404,
        message: 'Category not found',
      });
    }
    return updated;
  }

  async delete(id: string): Promise<{ success: boolean }> {
    const category = await this.categoryRepository.findById(id);
    if (!category) {
      throw new NotFoundException({
        status: 404,
        message: 'Category not found',
      });
    }

    // Check if category has associated content
    const hasContent = await this.categoryRepository.hasContent(id);
    if (hasContent) {
      throw new BadRequestException({
        status: 400,
        message: 'Cannot delete category with associated content',
      });
    }

    await this.categoryRepository.delete(id);
    return { success: true };
  }
}
