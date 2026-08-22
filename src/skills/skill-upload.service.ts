import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import AdmZip from 'adm-zip';
import { SkillStorageService } from './infrastructure/storage/skill-storage.service';
import { SkillRepository } from './infrastructure/persistence/relational/repositories/skill.repository';
import { SkillFileRepository } from './infrastructure/persistence/relational/repositories/skill-file.repository';
import { UserSkillBindingRepository } from './infrastructure/persistence/relational/repositories/user-skill-binding.repository';
import { FrontmatterValidator } from './infrastructure/frontmatter/frontmatter-validator';
import { SkillToolSchema } from './infrastructure/persistence/relational/entities/skill.entity';
import { SkillUpdateEventRepository } from './infrastructure/persistence/relational/repositories/skill-update-event.repository';
import type { ActorRole } from './skill-access';
import { AllConfigType } from '../config/config.type';

/**
 * SkillUploadService — two-stage commit pipeline for Skill Plaza.
 *
 * ★ Architecture: NO VERSIONING (per execution guide §1.2).
 * Upload is idempotent: createUploadUrl creates a draft placeholder row,
 * then confirmUpload overwrites the existing skill's manifest_content,
 * files, tools, content_hash, changelog. No version rows are inserted
 * and no version counter is incremented.
 *
 * Phase 1: client → POST /skills/upload-url → { uploadUrl, key, skillId }.
 *          The draft skill row is the source of truth for ownership.
 * Phase 2: client PUTs the zip to uploadUrl directly, then POSTs
 *          /skills/{id}/content with hash + metadata. Server downloads
 *          (or trusts client-hash), validates, overwrites in place.
 */

export interface CreateUploadUrlInput {
  filename: string;
  size: number;
  sourceFormat: 'md' | 'zip';
  hash: string;
  userId: number;
  // ★ NEW: when present, bind to existing skill (update path —
  // controller already gated via assertCanUpdateSkill)
  skillId?: string;
}

export interface CreateUploadUrlOutput {
  uploadUrl: string;
  key: string;
  skillId: string;
  cdnUrl: string;
  expiresAt: number;
}

export interface ConfirmUploadInput {
  skillId: string;
  ossKey: string;
  hash: string;
  sourceFormat: 'md' | 'zip';
  // ★ code 现在是可选的 — UI 不再传,由后端从 name + hash 派生
  code?: string;
  name: string;
  description?: string;
  changelog?: string;
  // ★ Optional category override — 见 DTO 上的注释
  category?: string;
  userId: number;
  // ★ NEW (Task 5 update path): flag flows down from controller.
  isUpdate?: boolean;
  // ★ NEW: only used when isUpdate=true.
  actorRole?: ActorRole;
  // ★ NEW: ISO 8601; only used when isUpdate=true.
  expectedUpdatedAt?: string;
}

export interface ConfirmUploadOutput {
  version: 1;
  skillId: string;
  filesCount: number;
  toolsCount: number;
}

// Zip size guard constants from spec §4.3.
const MAX_ZIP_FILES = 50;
const MAX_SINGLE_FILE_BYTES = 256 * 1024;

@Injectable()
export class SkillUploadService {
  private readonly logger = new Logger(SkillUploadService.name);

  constructor(
    private readonly storage: SkillStorageService,
    private readonly skillRepo: SkillRepository,
    private readonly fileRepo: SkillFileRepository,
    private readonly bindingRepo: UserSkillBindingRepository,
    private readonly configService: ConfigService<AllConfigType>,
    private readonly eventRepo: SkillUpdateEventRepository,
  ) {}

  // ============================================================
  // Phase 1: createUploadUrl
  // ============================================================

  async createUploadUrl(
    input: CreateUploadUrlInput,
  ): Promise<CreateUploadUrlOutput> {
    const maxTotalSizeKb =
      this.configService.get('skill.maxTotalSizeKb', { infer: true }) ?? 10240;
    const maxBytes = maxTotalSizeKb * 1024;

    if (input.size > maxBytes) {
      throw new PayloadTooLargeException(
        `zip too large: ${input.size} bytes > ${maxBytes} bytes`,
      );
    }

    // ★ Update path: bind to existing skillId. Authorization happens at the
    // controller layer via assertCanUpdateSkill.
    if (input.skillId) {
      const existing = await this.skillRepo.findById(input.skillId);
      if (!existing) {
        throw new NotFoundException(`skill ${input.skillId} not found`);
      }
      const presigned = await this.storage.createUploadUrl(
        input.skillId,
        input.hash,
      );
      return {
        uploadUrl: presigned.uploadUrl,
        key: presigned.key,
        skillId: presigned.skillId,
        cdnUrl: presigned.cdnUrl,
        expiresAt: presigned.expiresAt,
      };
    }

    // ★ NO VERSIONING: skillId is the sole identity. Use uuid v4.
    // 不做 contentHash 去重 — 同 zip 上传 N 次 = N 个独立 skill,各自新
    // skillId + 新 code(deriveCode 带唯一后缀,见下方)。
    const skillId = crypto.randomUUID();

    // Create placeholder skill row (status='draft'). Uploader is recorded
    // for audit; the row will be overwritten by confirmUpload.
    await this.skillRepo.create({
      id: skillId,
      code: this.deriveCode(input.filename, input.hash), // 直接用 final code 占位,免得 Phase 2 update 时换 code
      name: input.filename,
      description: `Draft placeholder for upload ${input.filename}`,
      uploaderType: 'platform',
      uploaderId: input.userId,
      status: 'draft',
      contentHash: input.hash,
    });

    const presigned = await this.storage.createUploadUrl(skillId, input.hash);

    return {
      uploadUrl: presigned.uploadUrl,
      key: presigned.key,
      skillId: presigned.skillId,
      cdnUrl: presigned.cdnUrl,
      expiresAt: presigned.expiresAt,
    };
  }

  // ============================================================
  // Phase 2: confirmUpload — idempotent overwrite
  // ============================================================

  async confirmUpload(input: ConfirmUploadInput): Promise<ConfirmUploadOutput> {
    const skill = await this.skillRepo.findById(input.skillId);
    if (!skill) {
      throw new NotFoundException(`skill ${input.skillId} not found`);
    }

    // ── Optimistic lock + hash short-circuit ─────────────────────────
    if (input.isUpdate) {
      if (
        input.expectedUpdatedAt &&
        skill.updatedAt.toISOString() !== input.expectedUpdatedAt
      ) {
        throw new ConflictException(
          `skill ${input.skillId} was modified by another request; refresh and retry`,
        );
      }
    }

    if (
      skill.contentHash === input.hash &&
      skill.manifestContent &&
      skill.manifestContent.length > 0
    ) {
      // For isUpdate=true: same hash resubmission still records an event
      // (user re-confirmed upload with no change — audit log is the source
      // of truth, not the content diff).
      if (input.isUpdate) {
        await this.eventRepo.create({
          skillId: input.skillId,
          actorUserId: input.userId,
          actorRole: input.actorRole ?? 'self',
          action: 'update',
          ossKey: `skills/${input.skillId}/${input.hash}.zip`,
          oldHash: skill.contentHash,
          newHash: input.hash,
          sourceFormat: input.sourceFormat,
          changelog: input.changelog ?? 'Resubmit (no change)',
        });
      }
      const existingFiles = await this.fileRepo.listBySkill(input.skillId);
      const existingTools = Array.isArray(skill.tools) ? skill.tools : [];
      return {
        version: 1,
        skillId: input.skillId,
        filesCount: existingFiles.length,
        toolsCount: existingTools.length,
      };
    }

    // ── Compute zip hash from key/ossKey-derived content ─────────────────
    // Per spec §4.3: confirm verifies sha256 matches what client claimed.
    // Since the upload happened directly to OSS via presigned URL, the
    // client must have computed sha256(client-side). We re-verify using a
    // local recomputation of any blob we have access to; when the blob is
    // not accessible to the server (presigned PUT case), we fall back to
    // trusting the client hash assertion that matches the key name
    // (key = `skills/{skillId}/{hash}.zip` is content-addressed).
    const expectedHashFromKey = this.extractHashFromKey(input.ossKey);
    if (expectedHashFromKey && expectedHashFromKey !== input.hash) {
      throw new BadRequestException(
        `hash mismatch: key ${input.ossKey} does not encode hash ${input.hash}`,
      );
    }

    // ── Locate the zip blob (download if available, else fall back) ────
    let zipBuffer: Buffer | null = null;
    try {
      zipBuffer = await this.tryDownloadZip(input.ossKey);
    } catch (err) {
      this.logger.warn(
        `could not download zip for verification (${(err as Error).message}); trusting client hash since key is content-addressed`,
      );
    }

    if (zipBuffer) {
      const actualHash = crypto
        .createHash('sha256')
        .update(zipBuffer)
        .digest('hex');
      if (actualHash !== input.hash) {
        throw new BadRequestException(
          `hash mismatch: client claimed ${input.hash} but blob hashes to ${actualHash}`,
        );
      }
    }

    // ── Parse zip + frontmatter ──────────────────────────────────────────
    if (!zipBuffer) {
      throw new BadRequestException(
        'confirmUpload requires server-side zip access; please use direct upload via storage service',
      );
    }

    const zip = new AdmZip(zipBuffer);
    const entries = zip.getEntries();

    if (entries.length > MAX_ZIP_FILES) {
      throw new BadRequestException(
        `too many files in zip: ${entries.length} > ${MAX_ZIP_FILES}`,
      );
    }

    // ── Spec §2.1: zip 顶层恰好 1 个目录(slug),所有文件都在它之下 ────
    // 旧版「SKILL.md 在 zip 根 + files/ 子目录」布局已废弃(spec 与 vibe 端
    // 都是新布局)。这里前置提取 slug,后面的路径都以 `${slug}/` 为前缀。
    const nonDirEntries = entries.filter((e) => !e.isDirectory);
    const topDirs = new Set<string>();
    for (const e of nonDirEntries) {
      const first = e.entryName.split('/')[0];
      if (first) topDirs.add(first);
    }
    if (topDirs.size !== 1) {
      throw new BadRequestException('zip 必须只包含一个顶层目录（即 slug 名）');
    }
    const slug = [...topDirs][0];
    if (!/^[a-z0-9-]{1,60}$/.test(slug)) {
      throw new BadRequestException(`目录名不符合 slug 规则: ${slug}`);
    }
    const slugPrefix = `${slug}/`;

    const skillMdEntry = entries.find(
      (e) => e.entryName === `${slugPrefix}SKILL.md`,
    );
    if (!skillMdEntry) {
      throw new BadRequestException('缺少 SKILL.md');
    }
    const skillMdRaw = skillMdEntry.getData().toString('utf-8');
    const parsed = FrontmatterValidator.parse(skillMdRaw);
    const fm = parsed.frontmatter;

    // Spec §4.3: source_format='md' must have empty files_index.
    if (input.sourceFormat === 'md') {
      const fi = fm.files_index ?? [];
      if (fi.length > 0) {
        throw new BadRequestException(
          'single .md mode must have empty files_index',
        );
      }
    }

    // ── Validate files_index paths exist in the zip ─────────────────────
    // files_index.path 在 frontmatter 里不带 <slug>/ 前缀(按 spec §6 例子,
    // 用户写 `path: references/chapters/ch01.md`)。这里把 entryName 里的
    // `<slug>/` 剥掉,再比对。
    const existingPaths = new Set(
      nonDirEntries.map((e) =>
        e.entryName.startsWith(slugPrefix)
          ? e.entryName.slice(slugPrefix.length)
          : e.entryName,
      ),
    );
    FrontmatterValidator.validateFilesIndexExist(
      fm.files_index ?? [],
      existingPaths,
    );

    // ── Persist tools (parsed from <slug>/tools/*.json if present) ────────
    // 工具 schema 走 spec §2.1 新布局:在 <slug>/tools/ 下直接放 JSON。
    const toolsSchema: SkillToolSchema[] = [];
    const toolEntries = entries.filter(
      (e) =>
        !e.isDirectory &&
        e.entryName.startsWith(`${slugPrefix}tools/`) &&
        e.entryName.endsWith('.json'),
    );
    for (const e of toolEntries) {
      try {
        const obj = JSON.parse(e.getData().toString('utf-8')) as Record<
          string,
          unknown
        >;
        if (typeof obj['name'] === 'string') {
          toolsSchema.push(obj as unknown as SkillToolSchema);
        }
      } catch {
        // skip malformed tool json (whitelist enforcement is post-MVP)
      }
    }

    // ── Update skill row (overwrite, no version increment) ───────────────
    // ★ 防御:class-validator 的 @IsOptional 只跳过 null/undefined,空字符串
    // "" 会通过 @IsString 校验但被 @Length(1,64) 拦下 — 但万一有客户端绕过
    // DTO 直接走 service,我们也兜底:空白视为未提供,走 deriveCode。
    const rawCode = input.code?.trim();
    const oldHash = skill.contentHash;
    // ★ D5: 更新不改 status — preserve whatever the row already has
    // (could be 'published' for normal updates, 'archived' for restoring via
    // admin restore path, or 'draft' if someone re-uploads a never-published skill)
    const targetStatus = input.isUpdate ? skill.status : 'published';

    await this.skillRepo.update(input.skillId, {
      // code/uploaderType/uploaderId/createdBy are identity fields — NEVER
      // touched in update mode (D7). For initial upload we derive / set them;
      // for update we carry through the existing values.
      code: input.isUpdate
        ? skill.code
        : rawCode && rawCode.length > 0
          ? rawCode
          : this.deriveCode(input.name, input.hash),
      name: input.name,
      // ★ description 语义重定义:这是「给其他用户看的」skill 简介
      // (skill card preview / skill detail dialog 展示),不是给 agent 的。
      // agent 用的描述在 SKILL.md frontmatter 里,通过 manifestContent 单独
      // 传给 Vibe。
      //
      // 服务端 fallback 规则:用户任何非空输入都尊重(即便很短),
      // 空字符串 / undefined 才回落到 frontmatter — 跟 category 兜底
      // 一致。早期版本曾要求 ≥10 chars,会把用户输入的 "test" 静默吞掉,
      // 改掉。
      description: input.description?.trim() || fm.description || '',
      category: input.category ?? fm.category ?? null,
      tags: fm.tags ?? null,
      manifestContent: skillMdRaw,
      // filesDirPath / toolsDirPath 是逻辑字符串字段,OSS 实际只有整 zip。
      // 值改成反映新布局:references/ 与 tools/ 直接挂在 skill 根下。
      filesDirPath: `skills/${input.skillId}/references`,
      toolsDirPath: `skills/${input.skillId}/tools`,
      manifestTokenEstimate: estimateTokens(parsed.body),
      contentHash: input.hash,
      changelog:
        input.changelog ?? (input.isUpdate ? 'Update' : 'Initial publish'),
      publishedAt: input.isUpdate ? skill.publishedAt : new Date(),
      // createdBy stays whatever it was — only set on initial create.
      createdBy: input.isUpdate ? skill.createdBy : input.userId,
      tools: toolsSchema,
      status: targetStatus,
    });

    // ★ Write audit event for update (D9). Same-hash resubmissions are handled
    // above in the idempotent short-circuit branch; this only fires when
    // content actually changed.
    if (input.isUpdate) {
      await this.eventRepo.create({
        skillId: input.skillId,
        actorUserId: input.userId,
        actorRole: input.actorRole ?? 'self',
        action: 'update',
        ossKey: `skills/${input.skillId}/${input.hash}.zip`,
        oldHash,
        newHash: input.hash,
        sourceFormat: input.sourceFormat,
        changelog: input.changelog ?? null,
      });
    }

    // ── Replace skill_file rows atomically (delete + insert) ────────────
    await this.fileRepo.replaceForSkill(input.skillId);

    // fileIndexMap 用 strip `<slug>/` 后的 path 作 key(SKILL.md frontmatter
    // 里的 files_index.path 不带 slug 前缀)
    const fileIndexMap = new Map<string, string>();
    for (const item of fm.files_index ?? []) {
      if (item.path) {
        fileIndexMap.set(item.path, item.description ?? '');
      }
    }

    // 白名单子目录(参考 spec §2.2 限定 5 个,这里 4 个,因为 tools/ 走
    // 单独分支不入 skill_file 表)
    const ALLOWED_FILE_SUBDIRS = [
      'references',
      'templates',
      'examples',
      'assets',
    ];

    let filesCount = 0;
    for (const entry of entries) {
      if (entry.isDirectory) continue;

      // 跳过 <slug>/SKILL.md
      if (entry.entryName === `${slugPrefix}SKILL.md`) continue;

      // 跳过 <slug>/tools/*.json(已在上方入库到 tools jsonb)
      if (
        entry.entryName.startsWith(`${slugPrefix}tools/`) &&
        entry.entryName.endsWith('.json')
      ) {
        continue;
      }

      // 白名单过滤:只有 <slug>/(references|templates|examples|assets)/...
      // 才入 skill_file 表。其他路径(顶层目录里的散落文件、<slug>/random/、
      // 老的 <slug>/files/ 等)直接 warn 忽略。
      const inWhiteList = ALLOWED_FILE_SUBDIRS.some((sub) =>
        entry.entryName.startsWith(`${slugPrefix}${sub}/`),
      );
      if (!inWhiteList) {
        this.logger.warn(
          `ignoring zip entry outside whitelist: ${entry.entryName}`,
        );
        continue;
      }

      const buf = entry.getData();
      if (buf.length > MAX_SINGLE_FILE_BYTES) {
        throw new BadRequestException(
          `file ${entry.entryName} exceeds ${MAX_SINGLE_FILE_BYTES} bytes`,
        );
      }

      // relativePath = strip `<slug>/` 前缀,Vibe 端调 ?path=... 时按这个查
      const relativePath = entry.entryName.slice(slugPrefix.length);
      // 描述按相对路径查(同样不带 slug 前缀)
      const description = fileIndexMap.get(relativePath) ?? '';

      await this.fileRepo.create({
        skillId: input.skillId,
        relativePath,
        // ★ FIX-6: oss_path 是 zip 的 OSS key — 所有文件都在同一个 zip object 里
        // (InternalSkillToolService.getFileContent 按 entryName 从 zip 提取)
        ossPath: `skills/${input.skillId}/${input.hash}.zip`,
        // entryName 存完整 zip entry 名(含 <slug>/),admin-server 读取时
        // 用它在 zip 内定位 entry
        entryName: entry.entryName,
        description: description || null,
        sizeBytes: buf.length,
        contentHash: crypto.createHash('sha256').update(buf).digest('hex'),
        tokenEstimate: estimateTokens(buf.toString('utf-8')),
        sortOrder: filesCount,
      });
      filesCount++;
    }

    return {
      version: 1,
      skillId: input.skillId,
      filesCount,
      toolsCount: toolsSchema.length,
    };
  }

  // ============================================================
  // Internal helpers
  // ============================================================

  /**
   * Extract hash from a content-addressed OSS key. Returns null if the
   * key does not match the canonical layout.
   */
  private extractHashFromKey(key: string): string | null {
    const m = /^skills\/[^/]+\/([a-f0-9]{64})\.zip$/i.exec(key);
    return m ? m[1].toLowerCase() : null;
  }

  /**
   * Derive a unique `skill.code` from the human-readable name.
   *
   * - ASCII name → kebab-case slug + 4 hex random suffix:
   *   "Trading Principles" → "trading-principles-a3f8"
   * - CJK-only name → "skill-<hash12>-<rand4>" since kebab-casing strips
   *   the meaningful characters.
   *
   * 后缀保证 `uq_skill_code` 唯一性 — 同 zip 重传 N 次 = N 个独立 skill,
   * 各自不同 code(uuid 之外的二级标识)。
   */
  private deriveCode(name: string, hash: string): string {
    const suffix = crypto.randomBytes(2).toString('hex'); // 4 hex chars = 16 bits
    const kebab = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);
    if (kebab.length >= 2) return `${kebab}-${suffix}`;
    return `skill-${hash.slice(0, 12)}-${suffix}`;
  }

  /**
   * Best-effort download. Returns null if the blob is not accessible;
   * caller falls back to trusting client hash + content-addressed key.
   */
  private async tryDownloadZip(key: string): Promise<Buffer | null> {
    try {
      return await this.storage.getObject(key);
    } catch {
      return null;
    }
  }
}

function estimateTokens(text: string): number {
  // MVP heuristic: 1 token ≈ 4 chars (English) / 1.5 chars (CJK). Use
  // conservative mid-point of 0.5 token per character so we don't blow
  // the budget before the LLM-side recount.
  return Math.ceil(text.length * 0.5);
}
