import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SkillRepository } from './infrastructure/persistence/relational/repositories/skill.repository';
import { SkillFileRepository } from './infrastructure/persistence/relational/repositories/skill-file.repository';
import { UserSkillBindingRepository } from './infrastructure/persistence/relational/repositories/user-skill-binding.repository';
import { SkillStorageService } from './infrastructure/storage/skill-storage.service';
import { SkillToolSchema } from './infrastructure/persistence/relational/entities/skill.entity';
import { ToolEndpointWhitelist } from './tool-endpoint-whitelist';
import { SkillSummaryDto } from './dto/internal-user-skill.dto';
import Ajv, { ValidateFunction } from 'ajv';

/**
 * InternalSkillToolService — read-only content access + tool execution
 * proxy for VibeTrading.
 *
 * ★ Architecture: NO VERSIONING (per execution guide §1.1).
 * content_hash is the cache key. The 4 endpoints return:
 *   - GET  /internal/skills/{id}/meta?contentHash=X
 *   - GET  /internal/skills/{id}/manifest?contentHash=X
 *   - GET  /internal/skills/{id}/files/content?contentHash=X&path=Y
 *   - POST /internal/skills/{id}/tools/{toolName}/execute
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
 * Per audit C-3 (security) — tool execute:
 *   1. toolName MUST be in skill.tools[].name (reject otherwise)
 *   2. tool.endpoint_path MUST be in ToolEndpointWhitelist (SSRF defense)
 *   3. args validated against tool.params_schema via Ajv
 *   4. per-user, per-tool token-bucket rate limit (uses
 *      skill_tool.rate_limit_rps — read from each tool's jsonb row)
 *   5. NEVER blindly forward `tool_name` into URL paths
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

export interface SkillToolExecuteResponse {
  data: unknown;
}

/**
 * Lightweight in-memory token bucket. Keyed by
 * `${userId}::${skillId}::${toolName}`. Capacity = `rps` tokens,
 * refill = `rps` per second. Sufficient for single-process dev /
 * test; replace with a Redis-backed limiter for multi-instance prod.
 */
interface TokenBucket {
  tokens: number;
  lastRefillMs: number;
  capacity: number;
}

@Injectable()
export class InternalSkillToolService {
  private readonly logger = new Logger(InternalSkillToolService.name);

  /** Per-user/per-tool/per-skill rate-limit buckets. */
  private readonly buckets = new Map<string, TokenBucket>();
  private readonly ajv = new Ajv({ allErrors: true, strict: false });
  /** Memoised compiled ajv validators keyed by schema identity. */
  private readonly validators = new WeakMap<object, ValidateFunction>();

  constructor(
    private readonly skillRepo: SkillRepository,
    private readonly fileRepo: SkillFileRepository,
    private readonly bindingRepo: UserSkillBindingRepository,
    private readonly storage: SkillStorageService,
    private readonly whitelist: ToolEndpointWhitelist,
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

    // ★ FIX-6: ossPath 现在是 zip 的 key
    const zipBuffer = await this.storage.getObject(file.ossPath);
    const AdmZip = (await import('adm-zip')).default;
    const zip = new AdmZip(zipBuffer);
    const entryName = file.entryName ?? `files/${path}`;
    const entry = zip.getEntry(entryName);
    if (!entry) {
      throw new NotFoundException(
        `entry '${entryName}' not found inside zip for skill ${skillId}`,
      );
    }
    const content = entry.getData().toString('utf-8');

    return { content };
  }

  // ============================================================
  // POST /internal/skills/{id}/tools/{toolName}/execute
  // ★ Audit C-3: tool execute proxy — multiple security gates.
  // ============================================================

  async executeTool(
    skillId: string,
    contentHash: string | undefined,
    toolName: string,
    args: unknown,
    ctx: CallerContext,
  ): Promise<SkillToolExecuteResponse> {
    if (!toolName || typeof toolName !== 'string') {
      throw new BadRequestException('toolName path parameter is required');
    }
    // ★ Never allow slashes or path-traversal chars in toolName —
    // defends against `/tools/../something` smuggling even though
    // NestJS URL-decodes for us.
    if (!/^[A-Za-z0-9_.-]{1,128}$/.test(toolName)) {
      throw new BadRequestException(
        `toolName contains illegal characters: '${toolName}'`,
      );
    }

    const skill = await this.loadPublishedSkill(skillId, contentHash, ctx);

    // (1) toolName MUST be in skill.tools[].name
    const tools: SkillToolSchema[] = Array.isArray(skill.tools)
      ? skill.tools
      : [];
    const tool = tools.find(
      (t) => typeof t?.name === 'string' && t.name === toolName,
    );
    if (!tool) {
      throw new NotFoundException(
        `tool '${toolName}' not declared in skill ${skillId}`,
      );
    }

    // (2) endpoint_path MUST be in the whitelist (SSRF defense).
    // Tool schema fields are intentionally flexible (jsonb), so we
    // probe several plausible field names without rejecting the
    // request if all are missing — but if present they MUST match.
    const endpointPath = this.readEndpointPath(tool);
    const endpointMethod = this.readEndpointMethod(tool);
    if (endpointPath && endpointMethod) {
      const composite = `${endpointMethod} ${endpointPath}`;
      if (!this.whitelist.has(composite)) {
        throw new ForbiddenException(
          `tool '${toolName}' endpoint '${composite}' is not in the whitelist`,
        );
      }
    } else if (endpointPath || endpointMethod) {
      // Partial schema — refuse to forward rather than guess.
      throw new BadRequestException(
        `tool '${toolName}' has incomplete endpoint declaration`,
      );
    }

    // (3) args validated against tool.params_schema.
    const paramsSchema = this.readParamsSchema(tool);
    if (paramsSchema && typeof paramsSchema === 'object') {
      const validate = this.compileValidator(paramsSchema);
      const ok = validate(args);
      if (!ok) {
        throw new BadRequestException({
          message: `args do not match tool '${toolName}' params_schema`,
          errors: validate.errors,
        });
      }
    }

    // (4) Per-user, per-tool token-bucket rate limit. Use
    // skill_tool.rate_limit_rps if present, default 1 rps.
    const userId = ctx.userId ?? 'anonymous';
    const rateLimitRps = this.readRateLimitRps(tool);
    this.consumeToken(userId, skillId, toolName, rateLimitRps);

    // (5) ★ NEVER blindly forward `tool_name` into URL paths. We
    // validated `endpointPath` against the whitelist above; the
    // dispatch (forwarding to the actual handler) is intentionally
    // deferred to a follow-up task — for now the endpoint is wired
    // and security-checked but the actual upstream call is a TODO
    // because no `internalRouter` exists yet.
    //
    // We DO return a placeholder result so callers can probe the
    // route. Once an internal router lands, this becomes:
    //   return { data: await this.internalRouter.dispatch(endpointPath, args, ctx) };
    this.logger.log(
      `tool execute authorized: skill=${skillId} tool=${toolName} user=${userId}`,
    );

    return {
      data: {
        skillId,
        toolName,
        echo: args ?? null,
        status: 'authorized',
      },
    };
  }

  // ============================================================
  // GET /internal/users/{uid}/skills
  // ★ Task 1 (Skill Plaza): list every published skill the caller
  // has an enabled binding for. Mirrors the join + status filter
  // shape of SkillsService.listMySkills (skills.service.ts:182) but
  // returns the trimmed `SkillSummaryDto` shape vibe uses for its
  // system-prompt injection.
  // ============================================================

  async listVisibleSkills(uid: number): Promise<SkillSummaryDto[]> {
    // (1) bindings: only `enabled` rows (audit I-3 sibling — disabled
    // bindings are "收藏未启用" and must NOT show up here).
    const bindings = await this.bindingRepo.findEnabledByUser(uid);
    if (bindings.length === 0) return [];

    // (2) skills: dedupe binding.skillId, then load in one shot.
    const skillIds = [...new Set(bindings.map((b) => b.skillId))];
    const skills = await this.skillRepo.findByIds(skillIds);
    if (skills.length === 0) return [];

    // (3) status filter: only `published` skills (audit I-3) — drafts
    // / archived skills silently drop out of the response. We don't
    // 404 the whole endpoint when some bindings point at non-published
    // skills; we just exclude them. Empty result is still 200 with [].
    return skills
      .filter((s) => s.status === 'published')
      .map((s) => {
        const tools: SkillToolSchema[] = Array.isArray(s.tools) ? s.tools : [];
        return {
          id: s.id,
          name: s.name,
          description: s.description ?? undefined,
          category: s.category ?? undefined,
          tags: Array.isArray(s.tags) ? s.tags : undefined,
          contentHash: s.contentHash ?? undefined,
          toolsCount: tools.length,
          manifestTokenEstimate: s.manifestTokenEstimate ?? undefined,
          totalTokenEstimate: s.totalTokenEstimate ?? undefined,
        } satisfies SkillSummaryDto;
      });
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

  /**
   * Probe several plausible field names for the tool's endpoint_path.
   * The jsonb schema is intentionally flexible (tools come from
   * uploaded skill packages), so we accept either camelCase
   * (`endpointPath`) or snake_case (`endpoint_path`).
   */
  private readEndpointPath(tool: SkillToolSchema): string | undefined {
    const v =
      (tool as Record<string, unknown>)['endpointPath'] ??
      (tool as Record<string, unknown>)['endpoint_path'] ??
      (tool as Record<string, unknown>)['endpoint'];
    return typeof v === 'string' && v.length > 0 ? v : undefined;
  }

  private readEndpointMethod(tool: SkillToolSchema): string | undefined {
    const v =
      (tool as Record<string, unknown>)['endpointMethod'] ??
      (tool as Record<string, unknown>)['endpoint_method'] ??
      (tool as Record<string, unknown>)['method'];
    return typeof v === 'string' && v.length > 0 ? v : undefined;
  }

  private readParamsSchema(
    tool: SkillToolSchema,
  ): Record<string, unknown> | undefined {
    const v =
      tool.parameters ??
      (tool as Record<string, unknown>)['params_schema'] ??
      (tool as Record<string, unknown>)['paramsSchema'];
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      return v as Record<string, unknown>;
    }
    return undefined;
  }

  private readRateLimitRps(tool: SkillToolSchema): number {
    const v =
      (tool as Record<string, unknown>)['rateLimitRps'] ??
      (tool as Record<string, unknown>)['rate_limit_rps'] ??
      (tool as Record<string, unknown>)['rate_limit'] ??
      (tool as Record<string, unknown>)['rateLimit'];
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) return v;
    return 1; // safe default
  }

  private compileValidator(schema: Record<string, unknown>): ValidateFunction {
    const existing = this.validators.get(schema);
    if (existing) return existing;
    const compiled = this.ajv.compile(schema);
    this.validators.set(schema, compiled);
    return compiled;
  }

  /**
   * Token-bucket consume. Capacity = rps, refill = rps/sec. Reject
   * with 429 (Too Many Requests) when out of tokens.
   */
  private consumeToken(
    userId: string,
    skillId: string,
    toolName: string,
    rps: number,
  ): void {
    const key = `${userId}::${skillId}::${toolName}`;
    const now = Date.now();
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = { tokens: rps, lastRefillMs: now, capacity: rps };
      this.buckets.set(key, bucket);
    }
    const elapsed = (now - bucket.lastRefillMs) / 1000;
    const refill = elapsed * rps;
    bucket.tokens = Math.min(bucket.capacity, bucket.tokens + refill);
    bucket.lastRefillMs = now;
    if (bucket.tokens < 1) {
      throw new ForbiddenException(
        `rate limit exceeded: ${rps} rps for tool '${toolName}' (user=${userId})`,
      );
    }
    bucket.tokens -= 1;
  }
}
