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
 *   4. Return ResolvedSkill[] — {id, code, name} for each binding so the
 *      upstream VibeTrading tool guard can accept any of the three as a
 *      load_skill_* tool argument (the LLM is told the UUID in the system
 *      prompt but may still pass code/name; without this the guard rejects
 *      with "skill 'X' not in current request's requested_skills").
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

/**
 * ★ 2026-08-20 augmented return shape.
 *
 * `id` is the canonical key (UUID). `code` and `name` are forwarded so
 * downstream code may treat any of the three as the same skill identity —
 * the goal is to be tolerant of an LLM passing `code`/`name` instead of
 * `id` to load_skill_* tool calls. All three are unique per skill row,
 * so any one is safe to use as a set key.
 */
export interface ResolvedSkill {
  id: string;
  code: string;
  name: string;
}

@Injectable()
export class SkillResolverService {
  private readonly logger = new Logger(SkillResolverService.name);

  constructor(
    private readonly bindingRepo: UserSkillBindingRepository,
    private readonly mountRepo: SessionSkillMountRepository,
    private readonly skillRepo: SkillRepository,
  ) {}

  /**
   * Resolve the skills that should be active for this user/session at
   * THIS sendMessage call. Real-time, not cached.
   *
   * @returns array of ResolvedSkill ({id, code, name}). Returns [] on any
   *          failure (never throws).
   */
  async resolve(
    userId: number,
    sessionId: string,
  ): Promise<ResolvedSkill[]> {
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
      return skills
        .filter((s) => s.status === 'published')
        .map(
          (s): ResolvedSkill => ({
            id: s.id,
            code: s.code,
            name: s.name,
          }),
        );
    } catch (e) {
      // ★ Resolve failure must NEVER block the chat — degrade to empty.
      this.logger.warn(
        `skill resolve failed for user=${userId} session=${sessionId}: ${(e as Error).message}`,
      );
      return [];
    }
  }
}
