import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SkillFileEntity } from '../entities/skill-file.entity';

/**
 * Skill Plaza — SkillFile repository (unversioned).
 *
 * Per execution-guide §1.2: skill_file.skill_version_id → skill_id.
 * Upload/edit overwrites; no version.
 */
@Injectable()
export class SkillFileRepository {
  constructor(
    @InjectRepository(SkillFileEntity)
    private readonly repository: Repository<SkillFileEntity>,
  ) {}

  findOne(
    skillId: string,
    relativePath: string,
  ): Promise<SkillFileEntity | null> {
    return this.repository.findOne({
      where: { skillId, relativePath },
    });
  }

  /**
   * Return metadata index (relativePath, description, tokenEstimate) only.
   * Per execution-guide §1.2: content is loaded from OSS on demand,
   * not stored in the DB read path.
   */
  async listIndexBySkill(
    skillId: string,
  ): Promise<
    Array<
      Pick<SkillFileEntity, 'relativePath' | 'description' | 'tokenEstimate'>
    >
  > {
    const rows = await this.repository.find({
      where: { skillId },
      select: ['relativePath', 'description', 'tokenEstimate'],
      order: { sortOrder: 'ASC', relativePath: 'ASC' },
    });
    return rows.map((r) => ({
      relativePath: r.relativePath,
      description: r.description,
      tokenEstimate: r.tokenEstimate,
    }));
  }

  listBySkill(skillId: string): Promise<SkillFileEntity[]> {
    return this.repository.find({
      where: { skillId },
      order: { sortOrder: 'ASC', relativePath: 'ASC' },
    });
  }

  async create(input: Partial<SkillFileEntity>): Promise<SkillFileEntity> {
    const entity = this.repository.create(input);
    return this.repository.save(entity);
  }

  /**
   * Idempotent overwrite: delete all existing rows for skillId, then
   * caller re-inserts the new set. Returns deleted count.
   */
  async replaceForSkill(skillId: string): Promise<number> {
    const result = await this.repository.delete({ skillId });
    return result.affected ?? 0;
  }
}
