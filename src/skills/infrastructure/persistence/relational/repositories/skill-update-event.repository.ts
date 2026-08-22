import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SkillUpdateEventEntity } from '../entities/skill-update-event.entity';

export interface CreateSkillUpdateEventInput {
  skillId: string;
  actorUserId: number;
  actorRole: 'self' | 'admin' | 'super_admin';
  action: 'update' | 'archive' | 'restore';
  ossKey?: string | null;
  oldHash?: string | null;
  newHash?: string | null;
  sourceFormat?: 'md' | 'zip' | null;
  changelog?: string | null;
}

@Injectable()
export class SkillUpdateEventRepository {
  constructor(
    @InjectRepository(SkillUpdateEventEntity)
    private readonly repo: Repository<SkillUpdateEventEntity>,
  ) {}

  async create(
    input: CreateSkillUpdateEventInput,
  ): Promise<SkillUpdateEventEntity> {
    return this.repo.save(
      this.repo.create({
        skillId: input.skillId,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        action: input.action,
        ossKey: input.ossKey ?? null,
        oldHash: input.oldHash ?? null,
        newHash: input.newHash ?? null,
        sourceFormat: input.sourceFormat ?? null,
        changelog: input.changelog ?? null,
      }),
    );
  }

  async findBySkill(
    skillId: string,
    limit = 100,
  ): Promise<SkillUpdateEventEntity[]> {
    return this.repo.find({
      where: { skillId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
