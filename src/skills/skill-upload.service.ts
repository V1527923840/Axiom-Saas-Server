import {
  BadRequestException,
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
  code: string;
  name: string;
  description: string;
  changelog?: string;
  // ★ Optional category override — 见 DTO 上的注释
  category?: string;
  userId: number;
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

    // ★ NO VERSIONING: skillId is the sole identity. Use uuid v4.
    const skillId = crypto.randomUUID();

    // Create placeholder skill row (status='draft'). Uploader is recorded
    // for audit; the row will be overwritten by confirmUpload.
    await this.skillRepo.create({
      id: skillId,
      code: input.hash, // temporary unique stand-in (uq_skill_code partial)
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

    // ── Idempotent short-circuit ─────────────────────────────────────────
    // If the skill already has the same content hash and a manifest, this
    // upload is a duplicate (client retry / network blip). Return existing
    // state without touching anything.
    if (
      skill.contentHash === input.hash &&
      skill.manifestContent &&
      skill.manifestContent.length > 0
    ) {
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

    const skillMdEntry = entries.find((e) => e.entryName === 'SKILL.md');
    if (!skillMdEntry) {
      throw new BadRequestException('SKILL.md missing from zip root');
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
    const existingPaths = new Set(
      entries.filter((e) => !e.isDirectory).map((e) => e.entryName),
    );
    FrontmatterValidator.validateFilesIndexExist(
      fm.files_index ?? [],
      existingPaths,
    );

    // ── Persist tools (parsed from files/tools/*.json if present) ────────
    const toolsSchema: SkillToolSchema[] = [];
    const toolEntries = entries.filter(
      (e) =>
        !e.isDirectory &&
        e.entryName.startsWith('files/tools/') &&
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
    await this.skillRepo.update(input.skillId, {
      code: input.code,
      name: input.name,
      description: input.description,
      category: input.category ?? fm.category ?? null,
      tags: fm.tags ?? null,
      manifestContent: skillMdRaw,
      filesDirPath: `skills/${input.skillId}/files`,
      toolsDirPath: `skills/${input.skillId}/files/tools`,
      manifestTokenEstimate: estimateTokens(parsed.body),
      contentHash: input.hash,
      changelog: input.changelog ?? null,
      publishedAt: new Date(),
      createdBy: input.userId,
      tools: toolsSchema,
      status: 'published',
    });

    // ── Replace skill_file rows atomically (delete + insert) ────────────
    await this.fileRepo.replaceForSkill(input.skillId);

    const fileIndexMap = new Map<string, string>();
    for (const item of fm.files_index ?? []) {
      if (item.path) {
        fileIndexMap.set(item.path, item.description ?? '');
      }
    }

    let filesCount = 0;
    for (const entry of entries) {
      if (entry.isDirectory) continue;
      if (entry.entryName === 'SKILL.md') continue;

      // Skip tool files (their metadata lives on skill.tools jsonb).
      if (
        entry.entryName.startsWith('files/tools/') &&
        entry.entryName.endsWith('.json')
      ) {
        continue;
      }

      // Only files under files/ are recorded as skill_file rows.
      if (!entry.entryName.startsWith('files/')) continue;

      const buf = entry.getData();
      if (buf.length > MAX_SINGLE_FILE_BYTES) {
        throw new BadRequestException(
          `file ${entry.entryName} exceeds ${MAX_SINGLE_FILE_BYTES} bytes`,
        );
      }

      const relativePath = entry.entryName.replace(/^files\//, '');
      const description = fileIndexMap.get(entry.entryName) ?? '';

      await this.fileRepo.create({
        skillId: input.skillId,
        relativePath,
        // ★ FIX-6: oss_path 改为 zip 的 OSS key — 所有文件都在同一个 zip object 里
        // (InternalSkillToolService.getFileContent 按 entryName 从 zip 提取)
        ossPath: `skills/${input.skillId}/${input.hash}.zip`,
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
