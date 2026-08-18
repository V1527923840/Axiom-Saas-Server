import { Injectable, Logger } from '@nestjs/common';
import { SkillRepository } from './infrastructure/persistence/relational/repositories/skill.repository';
import { UserSkillBindingRepository } from './infrastructure/persistence/relational/repositories/user-skill-binding.repository';
import { SessionSkillMountRepository } from './infrastructure/persistence/relational/repositories/session-skill-mount.repository';

/**
 * Skill Plaza — SkillResolverService (unversioned, ID-only).
 *
 * ★ Most critical service in the Skill Plaza architecture.
 *
 * Per spec §3.5 + executor guide §1:
 *   1. Baseline: user_skill_binding WHERE user_id = ? AND status = 'enabled'
 *   2. Session delta: session_skill_mount WHERE session_id = ?
 *   3. Apply delta (add → union, remove → subtract)
 *   4. Return only {id: string}[] — no version, no content
 *
 * Per spec §3.5.2 the 4 boundary cases are:
 *   - Enable  X / no mount      → contains X       (baseline wins)
 *   - Disable X / no mount      → does NOT contain X
 *   - Enable  X / mount(X,remove) → does NOT contain X (delta overrides)
 *   - Disable X / mount(X,add)    → contains X       (delta overrides)
 *
 * Per audit C-3 / C-6 + executor guide §1.1:
 *   - Do NOT inject sessionRepo (no ai_session entity in this module).
 *   - Do NOT include version in the return shape.
 *
 * Per spec §3.5.4 / §8.2:
 *   - On any failure, return [] and log a warn. Never block the chat.
 */
@Injectable()
export class SkillResolverService {
  private readonly logger = new Logger(SkillResolverService.name);

  constructor(
    private readonly bindingRepo: UserSkillBindingRepository,
    private readonly mountRepo: SessionSkillMountRepository,
    private readonly skillRepo: SkillRepository,
  ) {}

  /**
   * Resolve the skill IDs that should be active for this user/session at
   * THIS sendMessage call. Real-time, not cached.
   *
   * @returns array of skill IDs (strings only, no version, no content).
   *          Returns [] on any failure (never throws).
   */
  async resolve(userId: number, sessionId: string): Promise<string[]> {
    try {
      // 1. Baseline: user's enabled bindings.
      const userBindings = await this.bindingRepo.findEnabledByUser(userId);
      const candidateIds = new Set<string>(userBindings.map((b) => b.skillId));

      // 2 + 3. Session-level mounts: add → union, remove → subtract.
      const mounts = await this.mountRepo.findBySession(sessionId);
      for (const mount of mounts) {
        if (mount.op === 'add') {
          candidateIds.add(mount.skillId);
        } else if (mount.op === 'remove') {
          candidateIds.delete(mount.skillId);
        }
      }

      if (candidateIds.size === 0) {
        return [];
      }

      // 4. Only return published skills (skip draft / archived).
      const ids = [...candidateIds];
      const skills = await this.skillRepo.findByIds(ids);
      const published = skills
        .filter((s) => s.status === 'published')
        .map((s) => s.id);

      return published;
    } catch (e) {
      // ★ Resolve failure must NEVER block the chat — degrade to empty.
      this.logger.warn(
        `skill resolve failed for user=${userId} session=${sessionId}: ${(e as Error).message}`,
      );
      return [];
    }
  }
}
