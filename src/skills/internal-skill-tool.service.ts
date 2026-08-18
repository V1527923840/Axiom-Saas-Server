import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SkillRepository } from './infrastructure/persistence/relational/repositories/skill.repository';
import { SkillFileRepository } from './infrastructure/persistence/relational/repositories/skill-file.repository';
import { SkillStorageService } from './infrastructure/storage/skill-storage.service';
import { SkillToolSchema } from './infrastructure/persistence/relational/entities/skill.entity';

/**
 * InternalSkillToolService — read-only content access for VibeTrading.
 *
 * ★ Architecture: NO VERSIONING (per execution guide §1.1).
 * content_hash is the cache key. The 3 endpoints return:
 *   - GET /internal/skills/{id}/meta?contentHash=X
 *   - GET /internal/skills/{id}/manifest?contentHash=X
 *   - GET /internal/skills/{id}/files/content?contentHash=X&path=Y
 *
 * Per audit C-2 (spec §6.4 vs schema fields): meta MUST include
 * `toolsCount` even though the DB schema doesn't have a `tool_count`
 * column — derive it from `skill.tools` jsonb length.
 *
 * Per audit C-3 (security): the file-content endpoint MUST validate
 * `path` against the skill's actual file list. Reject with 400 if
 * `path` contains `..`, starts with `/`, or is not in
 * `skill_file.relative_path` for that skill.
 *
 * Per audit I-3: skills with status !== 'published' are not visible
 * to internal callers (return 403).
 */

export interface CallerContext {
  userId?: string;
  sessionId?: string;
  attemptId?: string;
}

export interface SkillMetaResponse {
  id: string;
  name: string;
  description: string;
  category: string | null;
  tags: string[] | null;
  contentHash: string | null;
  manifestTokenEstimate: number | null;
  totalTokenEstimate: number | null;
  toolsCount: number;
  files: Array<{
    relativePath: string;
    description: string | null;
    tokenEstimate: number | null;
  }>;
}

export interface SkillManifestResponse {
  content: string;
}

export interface SkillFileContentResponse {
  content: string;
}

@Injectable()
export class InternalSkillToolService {
  private readonly logger = new Logger(InternalSkillToolService.name);

  constructor(
    private readonly skillRepo: SkillRepository,
    private readonly fileRepo: SkillFileRepository,
    private readonly storage: SkillStorageService,
  ) {}

  // ============================================================
  // GET /internal/skills/{id}/meta
  // ============================================================

  async getMeta(
    skillId: string,
    contentHash: string | undefined,
    ctx: CallerContext,
  ): Promise<SkillMetaResponse> {
    const skill = await this.loadPublishedSkill(skillId, contentHash, ctx);

    const files = await this.fileRepo.listIndexBySkill(skillId);
    const tools: SkillToolSchema[] = Array.isArray(skill.tools)
      ? skill.tools
      : [];

    return {
      id: skill.id,
      name: skill.name,
      description: skill.description,
      category: skill.category,
      tags: skill.tags,
      contentHash: skill.contentHash,
      manifestTokenEstimate: skill.manifestTokenEstimate,
      totalTokenEstimate: skill.totalTokenEstimate,
      // ★ Audit C-2: toolsCount is derived from skill.tools jsonb length.
      toolsCount: tools.length,
      files: files.map((f) => ({
        relativePath: f.relativePath,
        description: f.description,
        tokenEstimate: f.tokenEstimate,
      })),
    };
  }

  // ============================================================
  // GET /internal/skills/{id}/manifest
  // ============================================================

  async getManifest(
    skillId: string,
    contentHash: string | undefined,
    ctx: CallerContext,
  ): Promise<SkillManifestResponse> {
    const skill = await this.loadPublishedSkill(skillId, contentHash, ctx);

    const content = skill.manifestContent ?? '';
    if (!content) {
      throw new NotFoundException(
        `manifest content not yet uploaded for skill ${skillId}`,
      );
    }

    return { content };
  }

  // ============================================================
  // GET /internal/skills/{id}/files/content?path=Y
  // ============================================================

  async getFileContent(
    skillId: string,
    contentHash: string | undefined,
    path: string | undefined,
    ctx: CallerContext,
  ): Promise<SkillFileContentResponse> {
    if (!path || typeof path !== 'string' || path.length === 0) {
      throw new BadRequestException('path query parameter is required');
    }

    // ★ Audit C-3: path traversal defense. Reject early on common
    // traversal patterns before touching the DB.
    this.assertPathSafe(path);

    await this.loadPublishedSkill(skillId, contentHash, ctx);

    // ★ Audit C-3: path MUST be in the skill's actual file list. The
    // skill_file table is the single source of truth for which files
    // belong to this skill.
    const file = await this.fileRepo.findOne(skillId, path);
    if (!file) {
      throw new NotFoundException(
        `file '${path}' not found in skill ${skillId}`,
      );
    }

    // Download from OSS.
    const buffer = await this.storage.getObject(file.ossPath);
    const content = buffer.toString('utf-8');

    return { content };
  }

  // ============================================================
  // Internal helpers
  // ============================================================

  /**
   * Load the skill and verify it is published. If a contentHash is
   * provided, verify it matches the skill's current content_hash
   * (caller is asking for a specific version of the content).
   *
   * Per audit I-3: non-published skills return 403, not 404, so the
   * caller can distinguish "not visible" from "doesn't exist".
   */
  private async loadPublishedSkill(
    skillId: string,
    contentHash: string | undefined,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _ctx: CallerContext,
  ): Promise<NonNullable<Awaited<ReturnType<SkillRepository['findById']>>>> {
    const skill = await this.skillRepo.findById(skillId);
    if (!skill) {
      throw new NotFoundException(`skill ${skillId} not found`);
    }

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

    return skill;
  }

  /**
   * ★ Audit C-3: Path traversal defense.
   *
   * Reject any path that:
   *   - contains `..` (directory traversal)
   *   - starts with `/` (absolute path)
   *   - contains a backslash (Windows-style separator / encoded)
   *   - contains a null byte (encoded null injection)
   *   - contains a percent-encoded segment (`%2e%2e` etc.)
   *
   * The remaining validation (path must be in skill_file.relative_path)
   * happens in the caller.
   */
  private assertPathSafe(path: string): void {
    if (path.includes('..')) {
      throw new BadRequestException(
        `path traversal detected: '${path}' contains '..'`,
      );
    }
    if (path.startsWith('/')) {
      throw new BadRequestException(
        `absolute path not allowed: '${path}' starts with '/'`,
      );
    }
    if (path.includes('\\')) {
      throw new BadRequestException(
        `path separator not allowed: '${path}' contains backslash`,
      );
    }
    if (path.includes('\0')) {
      throw new BadRequestException(`null byte not allowed in path: '${path}'`);
    }
    // URL-decoded paths are already decoded by NestJS, but reject
    // %-encoded forms defensively.
    if (/%2e|%2f|%5c|%00/i.test(path)) {
      throw new BadRequestException(
        `percent-encoded path segment not allowed: '${path}'`,
      );
    }
  }
}
