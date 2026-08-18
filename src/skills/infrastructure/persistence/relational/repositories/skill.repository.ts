import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { SkillEntity, SkillStatus } from '../entities/skill.entity';

/**
 * Skill Plaza — Skill repository (concrete, entity-direct).
 *
 * Per skill-plaza-execution-guide §5.1: concrete class, no mapper,
 * no domain for these tasks. findByIds deprecated in TypeORM 0.3 →
 * use findBy({ id: In(ids) }).
 */
@Injectable()
export class SkillRepository {
  constructor(
    @InjectRepository(SkillEntity)
    private readonly repository: Repository<SkillEntity>,
  ) {}

  findById(id: string): Promise<SkillEntity | null> {
    return this.repository.findOne({ where: { id } });
  }

  findByCode(code: string): Promise<SkillEntity | null> {
    return this.repository.findOne({ where: { code } });
  }

  findByIds(ids: string[]): Promise<SkillEntity[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return this.repository.findBy({ id: In(ids) });
  }

  findManyByIds(ids: string[]): Promise<SkillEntity[]> {
    return this.findByIds(ids);
  }

  listByStatus(status: SkillStatus): Promise<SkillEntity[]> {
    return this.repository.find({ where: { status } });
  }

  listPublished(): Promise<SkillEntity[]> {
    return this.listByStatus('published');
  }

  async create(input: Partial<SkillEntity>): Promise<SkillEntity> {
    const entity = this.repository.create(input);
    return this.repository.save(entity);
  }

  async update(id: string, patch: Partial<SkillEntity>): Promise<SkillEntity> {
    const existing = await this.findById(id);
    if (!existing) throw new Error(`skill ${id} not found`);
    Object.assign(existing, patch);
    return this.repository.save(existing);
  }

  async softDelete(id: string): Promise<void> {
    await this.repository.softDelete({ id });
  }
}
