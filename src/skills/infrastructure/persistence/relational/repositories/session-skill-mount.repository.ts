import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  SessionSkillMountEntity,
  MountOp,
  MountSource,
} from '../entities/session-skill-mount.entity';

/**
 * Skill Plaza — SessionSkillMount repository (unversioned).
 *
 * Per execution-guide §1.2: no skill_version column. Unique on
 * (session_id, skill_id). Used by SkillResolverService to compute
 * per-session add/remove delta on top of the user's enabled baseline.
 */
export interface UpsertMountInput {
  sessionId: string;
  skillId: string;
  op: MountOp;
  source: MountSource;
}

@Injectable()
export class SessionSkillMountRepository {
  constructor(
    @InjectRepository(SessionSkillMountEntity)
    private readonly repository: Repository<SessionSkillMountEntity>,
  ) {}

  findBySession(sessionId: string): Promise<SessionSkillMountEntity[]> {
    return this.repository.find({ where: { sessionId } });
  }

  findOne(
    sessionId: string,
    skillId: string,
  ): Promise<SessionSkillMountEntity | null> {
    return this.repository.findOne({ where: { sessionId, skillId } });
  }

  /**
   * Upsert (sessionId, skillId) row with new op + source. No version
   * parameter per execution-guide §1.2 (unversioned schema).
   */
  async upsert(input: UpsertMountInput): Promise<SessionSkillMountEntity> {
    const existing = await this.findOne(input.sessionId, input.skillId);
    if (existing) {
      existing.op = input.op;
      existing.source = input.source;
      return this.repository.save(existing);
    }
    const entity = this.repository.create(input);
    return this.repository.save(entity);
  }

  async remove(sessionId: string, skillId: string): Promise<void> {
    await this.repository.delete({ sessionId, skillId });
  }
}
