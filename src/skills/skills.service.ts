import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SkillRepository } from './infrastructure/persistence/relational/repositories/skill.repository';
import { SkillFileRepository } from './infrastructure/persistence/relational/repositories/skill-file.repository';
import { UserSkillBindingRepository } from './infrastructure/persistence/relational/repositories/user-skill-binding.repository';
import { SessionSkillMountRepository } from './infrastructure/persistence/relational/repositories/session-skill-mount.repository';
import {
  SkillEntity,
  SkillToolSchema,
} from './infrastructure/persistence/relational/entities/skill.entity';
import {
  SessionSkillMountItemDto,
  SkillFileIndexDto,
  SkillResponseDto,
  SkillToolSummaryDto,
} from './dto/skill-response.dto';
import { QuerySkillsDto } from './dto/query-skills.dto';

/**
 * SkillsService — orchestration layer for the public SkillsController.
 *
 * Thin facade over the four Skill-Plaza repositories. It does NOT own
 * any persistent business logic — that lives in SkillUploadService
 * (upload pipeline), SkillResolverService (per-session resolve), and
 * InternalSkillToolService (read-only content for Vibe).
 *
 * Responsibilities:
 *   - list / detail / file-index / tool-index reads (RBAC filtered)
 *   - user-side enable / disable (mutates user_skill_binding)
 *   - session-level mount / unmount (mutates session_skill_mount)
 *
 * NOTE: visibility check for cross-user reads is intentionally left to
 * the caller — the public REST API in this task is scoped to the caller's
 * own bindings. Cross-user reads (admin) come in a later task.
 */
@Injectable()
export class SkillsService {
  constructor(
    private readonly skillRepo: SkillRepository,
    private readonly fileRepo: SkillFileRepository,
    private readonly bindingRepo: UserSkillBindingRepository,
    private readonly mountRepo: SessionSkillMountRepository,
  ) {}

  // ============================================================
  // Reads
  // ============================================================

  /**
   * Cursor pagination over the skill catalog. Filtered by optional status
   * (default: 'published') so the public marketplace never sees drafts.
   */
  async findManyWithPagination(query: QuerySkillsDto): Promise<{
    data: SkillEntity[];
    total: number;
  }> {
    const page = query.page ?? 1;
    const limit = query.pageSize ?? 20;

    const where: Partial<Pick<SkillEntity, 'status' | 'category'>> = {};
    if (query.status) where.status = query.status;
    if (query.category) where.category = query.category;

    const order: { [k: string]: 'ASC' | 'DESC' } = {
      [(query.sortBy ?? 'updatedAt') as string]: query.sortOrder ?? 'DESC',
    };

    const [rows, total] = await this.skillRepo.findAndCount({
      where,
      page,
      limit,
      order,
    });

    return { data: rows, total };
  }

  async findById(id: string): Promise<SkillResponseDto> {
    const skill = await this.skillRepo.findById(id);
    if (!skill) throw new NotFoundException(`skill ${id} not found`);
    return this.toResponseDto(skill);
  }

  /**
   * Public mapper used by controllers that receive raw entities (e.g.
   * the paginated list endpoint, which wants to avoid an extra round-
   * trip per row). Mirrors `findById`'s return shape.
   */
  toResponseDtoPublic(skill: SkillEntity): SkillResponseDto {
    return this.toResponseDto(skill);
  }

  /**
   * File metadata index for a skill. Content is intentionally NOT returned
   * — Vibe pulls file bytes via the internal /files/content endpoint.
   *
   * If `contentHash` is supplied, it's used to detect hash drift (the
   * caller wants the index for a specific content version). For now we
   * simply return the current index and let the caller decide what to
   * do when hashes differ — keeps the public endpoint cheap.
   */
  async listFiles(
    skillId: string,
    contentHash?: string,
  ): Promise<SkillFileIndexDto[]> {
    const skill = await this.skillRepo.findById(skillId);
    if (!skill) throw new NotFoundException(`skill ${skillId} not found`);
    if (skill.status !== 'published') {
      throw new ForbiddenException(
        `skill ${skillId} is not published (status=${skill.status})`,
      );
    }
    if (contentHash && skill.contentHash && contentHash !== skill.contentHash) {
      throw new NotFoundException(
        `content hash mismatch for skill ${skillId}: expected ${skill.contentHash}`,
      );
    }

    const index = await this.fileRepo.listIndexBySkill(skillId);
    return index.map((f) => ({
      relativePath: f.relativePath,
      description: f.description,
      tokenEstimate: f.tokenEstimate,
    }));
  }

  /**
   * Tool summary list from the skill's `tools` jsonb column.
   * Same hash-drift semantics as `listFiles`.
   */
  async listTools(
    skillId: string,
    contentHash?: string,
  ): Promise<SkillToolSummaryDto[]> {
    const skill = await this.skillRepo.findById(skillId);
    if (!skill) throw new NotFoundException(`skill ${skillId} not found`);
    if (skill.status !== 'published') {
      throw new ForbiddenException(
        `skill ${skillId} is not published (status=${skill.status})`,
      );
    }
    if (contentHash && skill.contentHash && contentHash !== skill.contentHash) {
      throw new NotFoundException(
        `content hash mismatch for skill ${skillId}: expected ${skill.contentHash}`,
      );
    }

    const tools: SkillToolSchema[] = Array.isArray(skill.tools)
      ? skill.tools
      : [];
    return tools.map((t) => ({
      name: t.name,
      description: t.description ?? null,
      parameters:
        t.parameters && typeof t.parameters === 'object'
          ? (t.parameters as Record<string, unknown>)
          : null,
      tokenEstimate:
        typeof t['token_estimate'] === 'number'
          ? (t['token_estimate'] as number)
          : null,
    }));
  }

  // ============================================================
  // User bindings
  // ============================================================

  /**
   * List the caller's enabled bindings, joined with the skill row so the
   * client can render the marketplace tile directly.
   */
  async listMyEnabledSkills(userId: number): Promise<SkillResponseDto[]> {
    const bindings = await this.bindingRepo.findEnabledByUser(userId);
    if (bindings.length === 0) return [];

    const skillIds = [...new Set(bindings.map((b) => b.skillId))];
    const skills = await this.skillRepo.findByIds(skillIds);
    return skills.map((s) => this.toResponseDto(s));
  }

  /**
   * Enable a skill for the caller — creates a user_self binding.
   * Idempotent: re-enabling the same skill is a no-op (binding.enable()
   * reuses the existing row).
   */
  async enableForUser(
    userId: number,
    skillId: string,
  ): Promise<{ data: { skillId: string; enabled: true } }> {
    const skill = await this.skillRepo.findById(skillId);
    if (!skill) throw new NotFoundException(`skill ${skillId} not found`);
    if (skill.status !== 'published') {
      throw new ForbiddenException(
        `skill ${skillId} is not published (status=${skill.status})`,
      );
    }

    await this.bindingRepo.enable({
      userId,
      skillId,
      source: 'user_self',
      sourceRefId: null,
      enabledBy: userId,
    });

    return { data: { skillId, enabled: true } };
  }

  /**
   * Disable a skill for the caller. Only the user_self binding is touched —
   * plan- and admin-assigned bindings are left intact (per spec §4.4).
   */
  async disableForUser(
    userId: number,
    skillId: string,
  ): Promise<{ data: { skillId: string; enabled: false } }> {
    await this.bindingRepo.disable(userId, skillId, 'user_self', null);
    return { data: { skillId, enabled: false } };
  }

  // ============================================================
  // Session mounts
  // ============================================================

  /**
   * List the caller's session-scoped mounts (add/remove).
   */
  async listSessionMounts(
    sessionId: string,
  ): Promise<SessionSkillMountItemDto[]> {
    const rows = await this.mountRepo.findBySession(sessionId);
    return rows.map((m) => ({
      skillId: m.skillId,
      op: m.op,
      source: m.source,
      mountedAt: m.mountedAt,
    }));
  }

  /**
   * Mount or unmount a skill for a specific session.
   *
   * The op is encoded in the body (not the URL) per the Task 15 brief —
   * the path stays a clean PUT /sessions/{id}/skills/{skillId} and the
   * client just sets `op='add'` or `op='remove'`.
   */
  async setSessionMount(
    sessionId: string,
    skillId: string,
    op: 'add' | 'remove',
    source: 'manual' | 'auto_matched',
  ): Promise<{
    data: { sessionId: string; skillId: string; op: 'add' | 'remove' };
  }> {
    const skill = await this.skillRepo.findById(skillId);
    if (!skill) throw new NotFoundException(`skill ${skillId} not found`);

    await this.mountRepo.upsert({
      sessionId,
      skillId,
      op,
      source,
    });

    return { data: { sessionId, skillId, op } };
  }

  // ============================================================
  // Helpers
  // ============================================================

  private toResponseDto(skill: SkillEntity): SkillResponseDto {
    const tools: SkillToolSchema[] = Array.isArray(skill.tools)
      ? skill.tools
      : [];
    return {
      id: skill.id,
      code: skill.code,
      name: skill.name,
      description: skill.description,
      category: skill.category,
      tags: skill.tags,
      thumbnailUrl: skill.thumbnailUrl,
      uploaderType: skill.uploaderType,
      marketplaceStatus: skill.marketplaceStatus,
      status: skill.status,
      contentHash: skill.contentHash,
      publishedAt: skill.publishedAt,
      changelog: skill.changelog,
      tools,
      createdAt: skill.createdAt,
      updatedAt: skill.updatedAt,
    };
  }
}
