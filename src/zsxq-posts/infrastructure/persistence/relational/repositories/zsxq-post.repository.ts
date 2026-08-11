import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ZsxqPostEntity } from '../entities/zsxq-post.entity';
import { ZsxqPostMapper } from '../mappers/zsxq-post.mapper';
import { ZsxqPostRepository } from '../../zsxq-post.repository';
import { ZsxqPost } from '../../../../domain/zsxq-post';

@Injectable()
export class ZsxqPostRelationalRepository implements ZsxqPostRepository {
  constructor(
    @InjectRepository(ZsxqPostEntity)
    private readonly repository: Repository<ZsxqPostEntity>,
  ) {}

  async findManyByIds(ids: string[]): Promise<ZsxqPost[]> {
    if (!ids.length) return [];
    const entities = await this.repository.find({ where: { id: In(ids) } });
    return entities.map((entity) => ZsxqPostMapper.toDomain(entity));
  }
}
