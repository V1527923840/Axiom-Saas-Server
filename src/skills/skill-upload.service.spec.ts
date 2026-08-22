import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import AdmZip from 'adm-zip';
import { SkillUploadService } from './skill-upload.service';
import { SkillStorageService } from './infrastructure/storage/skill-storage.service';
import { SkillRepository } from './infrastructure/persistence/relational/repositories/skill.repository';
import { SkillFileRepository } from './infrastructure/persistence/relational/repositories/skill-file.repository';
import { SkillUpdateEventRepository } from './infrastructure/persistence/relational/repositories/skill-update-event.repository';

/**
 * Spec for SkillUploadService — the two-stage commit pipeline.
 *
 * ★ Architecture (per execution guide §1.2): NO VERSIONING. Upload is
 * idempotent. PUT /skills/{id}/content overwrites the existing skill's
 * manifest_content, files, tools, content_hash, changelog. No version
 * rows are created or incremented.
 *
 * TDD pattern follows skill.repository.spec.ts: jest.fn() mock objects
 * (SQLite can't reproduce Postgres jsonb / timestamptz).
 */

describe('SkillUploadService', () => {
  let svc: SkillUploadService;
  let storage: jest.Mocked<SkillStorageService>;
  let skillRepo: jest.Mocked<SkillRepository>;
  let fileRepo: jest.Mocked<SkillFileRepository>;
  let bindingRepo: any;
  let eventRepo: jest.Mocked<SkillUpdateEventRepository>;
  let config: { get: jest.Mock };

  function frontmatter(name: string, description: string, extra = ''): string {
    return [
      '---',
      `name: ${name}`,
      `description: ${description}`,
      'version: 1',
      'category: trading',
      'tags:',
      '  - finance',
      `${extra}`,
      '---',
      '',
      '# body',
      '',
    ].join('\n');
  }

  function buildZip(entries: Array<{ name: string; content: string }>): Buffer {
    const zip = new AdmZip();
    for (const e of entries) {
      zip.addFile(e.name, Buffer.from(e.content, 'utf-8'));
    }
    return zip.toBuffer();
  }

  function makeConfigStub(): {
    get: jest.Mock;
  } {
    return {
      get: jest.fn((key: string) => {
        if (key === 'skill.maxTotalSizeKb') return 10240;
        return undefined;
      }),
    };
  }

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});

    storage = {
      createUploadUrl: jest.fn().mockImplementation((skillId, hash) =>
        Promise.resolve({
          uploadUrl: 'https://oss.example/upload',
          key: `skills/${skillId}/${hash}.zip`,
          skillId,
          cdnUrl: `https://cdn.example/${skillId}/${hash}.zip`,
          expiresAt: Date.now() + 900_000,
        }),
      ),
      getObject: jest.fn(),
    } as any;

    skillRepo = {
      findById: jest.fn(),
      findByCode: jest.fn().mockResolvedValue(null),
      findByContentHash: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      update: jest.fn(),
    } as any;

    fileRepo = {
      replaceForSkill: jest.fn().mockResolvedValue(0),
      create: jest.fn((input: any) =>
        Promise.resolve({ id: 'file-id', ...input }),
      ),
      listBySkill: jest.fn().mockResolvedValue([]),
    } as any;

    bindingRepo = {
      create: jest.fn(),
    };

    eventRepo = {
      create: jest.fn().mockResolvedValue({ id: 'ev-default' }),
      findBySkill: jest.fn(),
    } as any;

    config = makeConfigStub();

    svc = new SkillUploadService(
      storage,
      skillRepo,
      fileRepo,
      bindingRepo,
      config as unknown as ConfigService,
      eventRepo,
    );
  });

  // ============================================================
  // Phase 1: createUploadUrl — returns skillId + key + uploadUrl,
  // creates a placeholder skill row with status='draft'.
  // ============================================================

  it('should reject createUploadUrl when size exceeds maxTotalSizeKb', async () => {
    await expect(
      svc.createUploadUrl({
        filename: 'x.zip',
        size: 11 * 1024 * 1024, // 11 MB > 10 MB limit
        sourceFormat: 'zip',
        hash: 'h',
        userId: 1,
      }),
    ).rejects.toThrow(/too large/i);
  });

  it('should create a draft skill row and return skillId + key + uploadUrl', async () => {
    skillRepo.create.mockImplementation((input: any) =>
      Promise.resolve({
        id: input.id,
        code: input.code,
        name: input.name,
        description: input.description,
        status: input.status,
      } as any),
    );

    const out = await svc.createUploadUrl({
      filename: 'pkg.zip',
      size: 1024,
      sourceFormat: 'zip',
      hash: 'h-pending',
      userId: 7,
    });

    expect(skillRepo.create).toHaveBeenCalledTimes(1);
    const createArg = skillRepo.create.mock.calls[0][0];
    expect(createArg.status).toBe('draft');
    expect(createArg.uploaderType).toBe('platform');
    expect(createArg.uploaderId).toBe(7);

    expect(storage.createUploadUrl).toHaveBeenCalledTimes(1);
    const callArgs = storage.createUploadUrl.mock.calls[0];
    expect(callArgs[0]).toBe(out.skillId);
    expect(callArgs[1]).toBe('h-pending');

    expect(out.uploadUrl).toBe('https://oss.example/upload');
    expect(out.key).toBe(`skills/${out.skillId}/h-pending.zip`);
    expect(out.skillId).toMatch(/^[0-9a-f-]{36}$/i);
  });

  // ============================================================
  // Phase 2: confirmUpload — the idempotent overwrite.
  // ============================================================

  it('should no-op (return existing state) when skill exists AND contentHash matches', async () => {
    const skillId = crypto.randomUUID();
    const skill = {
      id: skillId,
      code: 'already',
      name: 'Already',
      description: 'Already uploaded',
      status: 'published',
      contentHash: 'knownhash',
      manifestContent: 'existing manifest',
      tools: [{ name: 'existingTool' }],
    } as any;

    skillRepo.findById.mockResolvedValue(skill);

    const out = await svc.confirmUpload({
      skillId,
      ossKey: 'skills/x/y.zip',
      hash: 'knownhash',
      sourceFormat: 'zip',
      code: 'already',
      name: 'Already',
      description: 'Already uploaded',
      userId: 99,
    });

    expect(out.version).toBe(1);
    expect(out.skillId).toBe(skillId);
    // No-op means: no skill update, no file replacement, no file create.
    expect(skillRepo.update).not.toHaveBeenCalled();
    expect(fileRepo.replaceForSkill).not.toHaveBeenCalled();
    expect(fileRepo.create).not.toHaveBeenCalled();
  });

  it('should overwrite manifest_content / content_hash / tools / files when hash differs', async () => {
    const skillId = crypto.randomUUID();
    const skill = {
      id: skillId,
      code: 's1',
      name: 'S1',
      description: 'S1 description',
      status: 'published',
      contentHash: 'OLD-hash',
      manifestContent: 'OLD manifest',
      tools: [],
    } as any;
    skillRepo.findById.mockResolvedValue(skill);
    skillRepo.update.mockResolvedValue({
      ...skill,
      contentHash: 'NEW-hash',
    } as any);

    const skillMd = frontmatter(
      'NewName',
      'Long enough description here yes.',
      '',
    );
    const fileContent = '# File body\nnew content here.';
    // ★ spec §2.1 布局: <slug>/SKILL.md + <slug>/references/principles.md
    const zipBuffer = buildZip([
      { name: 'test-skill/SKILL.md', content: skillMd },
      { name: 'test-skill/references/principles.md', content: fileContent },
    ]);
    const newHash = crypto.createHash('sha256').update(zipBuffer).digest('hex');
    storage.getObject.mockResolvedValue(zipBuffer);

    const out = await svc.confirmUpload({
      skillId,
      ossKey: `skills/${skillId}/${newHash}.zip`,
      hash: newHash,
      sourceFormat: 'zip',
      code: 's1',
      name: 'NewName',
      description: 'Long enough description here yes.',
      changelog: 'initial',
      userId: 1,
    });

    expect(out.version).toBe(1);
    expect(out.skillId).toBe(skillId);
    expect(out.filesCount).toBe(1);
    expect(out.toolsCount).toBe(0);

    // Skill row must be updated with new metadata + content_hash + changelog.
    expect(skillRepo.update).toHaveBeenCalledTimes(1);
    const updateArg = skillRepo.update.mock.calls[0][1];
    expect(updateArg.contentHash).toBe(newHash);
    expect(updateArg.manifestContent).toContain('# body');
    expect(updateArg.changelog).toBe('initial');
    expect(updateArg.tools).toEqual([]);
    // ★ description 是「给其他用户看的」skill 简介 — 用户任何非空输入
    // 都尊重,不被 service 静默替换成 frontmatter 版本
    expect(updateArg.description).toBe('Long enough description here yes.');

    // Files must have been replaced (deleted + recreated).
    expect(fileRepo.replaceForSkill).toHaveBeenCalledWith(skillId);
    expect(fileRepo.create).toHaveBeenCalledTimes(1);
    const created = fileRepo.create.mock.calls[0][0];
    expect(created.skillId).toBe(skillId);
    // relativePath = strip `<slug>/`,保留 references/ 前缀
    expect(created.relativePath).toBe('references/principles.md');
    // entryName 完整 zip entry 名(含 <slug>/)
    expect(created.entryName).toBe('test-skill/references/principles.md');
  });

  it('should reject if skill does not exist', async () => {
    skillRepo.findById.mockResolvedValue(null);
    const skillId = crypto.randomUUID();

    await expect(
      svc.confirmUpload({
        skillId,
        ossKey: 'skills/x/y.zip',
        hash: 'h',
        sourceFormat: 'zip',
        code: 'c',
        name: 'n',
        description: 'description-long-enough',
        userId: 1,
      }),
    ).rejects.toThrow(/not found/i);
  });

  it('should reject (BadRequest) when sha256 hash mismatches', async () => {
    const skillId = crypto.randomUUID();
    const skill = {
      id: skillId,
      code: 'c',
      name: 'n',
      description: 'd',
      status: 'draft',
      contentHash: null,
      manifestContent: '',
      tools: [],
    } as any;
    skillRepo.findById.mockResolvedValue(skill);

    // Storage returns a buffer that does NOT match the claimed hash.
    storage.getObject.mockResolvedValue(Buffer.from('not-the-claimed-content'));

    await expect(
      svc.confirmUpload({
        skillId,
        ossKey: 'skills/x/y.zip',
        hash: 'wrong-hash',
        sourceFormat: 'zip',
        code: 'c',
        name: 'n',
        description: 'description-long-enough',
        userId: 1,
      }),
    ).rejects.toThrow(/hash mismatch|not found|ENOENT|missing/i);
  });

  it('should reject if SKILL.md is missing from zip', async () => {
    const skillId = crypto.randomUUID();
    const skill = {
      id: skillId,
      code: 'c',
      name: 'n',
      description: 'd',
      status: 'draft',
      contentHash: null,
      manifestContent: '',
      tools: [],
    } as any;
    skillRepo.findById.mockResolvedValue(skill);

    const zipBuffer = buildZip([{ name: 'files/readme.md', content: 'hello' }]);
    const hash = crypto.createHash('sha256').update(zipBuffer).digest('hex');
    storage.getObject.mockResolvedValue(zipBuffer);

    await expect(
      svc.confirmUpload({
        skillId,
        ossKey: `skills/${skillId}/${hash}.zip`,
        hash,
        sourceFormat: 'zip',
        code: 'c',
        name: 'n',
        description: 'description-long-enough',
        userId: 1,
      }),
    ).rejects.toThrow(/SKILL\.md|frontmatter|missing/i);
  });

  it('should reject frontmatter with invalid name/description', async () => {
    const skillId = crypto.randomUUID();
    const skill = {
      id: skillId,
      code: 'c',
      name: 'n',
      description: 'd',
      status: 'draft',
      contentHash: null,
      manifestContent: '',
      tools: [],
    } as any;
    skillRepo.findById.mockResolvedValue(skill);

    const badSkillMd = frontmatter('BAD-name', 'short'); // description too short
    // Override description to be invalid (less than 10 chars)
    const malformed = [
      '---',
      'name: x',
      'description: short',
      'version: 1',
      '---',
      '',
      '# body',
      '',
    ].join('\n');
    // ★ spec §2.1: SKILL.md 在 <slug>/ 下
    const zipBuffer = buildZip([
      { name: 'test-skill/SKILL.md', content: malformed },
    ]);
    const hash = crypto.createHash('sha256').update(zipBuffer).digest('hex');
    storage.getObject.mockResolvedValue(zipBuffer);

    await expect(
      svc.confirmUpload({
        skillId,
        ossKey: `skills/${skillId}/${hash}.zip`,
        hash,
        sourceFormat: 'zip',
        code: 'c',
        name: 'x',
        description: 'short',
        userId: 1,
      }),
    ).rejects.toThrow(/frontmatter|description|10-500/i);

    // Reference badSkillMd to suppress unused warning under strict mode.
    expect(badSkillMd).toBeDefined();
  });

  it('should parse files_index from frontmatter and persist corresponding skill_file rows', async () => {
    const skillId = crypto.randomUUID();
    const skill = {
      id: skillId,
      code: 'c',
      name: 'n',
      description: 'd',
      status: 'draft',
      contentHash: null,
      manifestContent: '',
      tools: [],
    } as any;
    skillRepo.findById.mockResolvedValue(skill);
    skillRepo.update.mockResolvedValue(skill as any);

    const skillMd = [
      '---',
      'name: WithIndex',
      'description: Has a files_index array',
      'version: 1',
      // files_index.path 不带 <slug>/ 前缀(spec §6 例子)
      'files_index:',
      '  - path: references/principles.md',
      '    description: Core principles',
      '  - path: references/checklist.md',
      '    description: Pre-trade checklist',
      '---',
      '# body',
      '',
    ].join('\n');
    // ★ spec §2.1 布局
    const zipBuffer = buildZip([
      { name: 'test-skill/SKILL.md', content: skillMd },
      { name: 'test-skill/references/principles.md', content: '# Principles' },
      { name: 'test-skill/references/checklist.md', content: '# Checklist' },
    ]);
    const hash = crypto.createHash('sha256').update(zipBuffer).digest('hex');
    storage.getObject.mockResolvedValue(zipBuffer);

    const out = await svc.confirmUpload({
      skillId,
      ossKey: `skills/${skillId}/${hash}.zip`,
      hash,
      sourceFormat: 'zip',
      code: 'c',
      name: 'WithIndex',
      description: 'Has a files_index array',
      userId: 1,
    });

    expect(out.filesCount).toBe(2);
    expect(fileRepo.create).toHaveBeenCalledTimes(2);
    const created = fileRepo.create.mock.calls.map((c) => c[0]);
    expect(created.every((c) => c.skillId === skillId)).toBe(true);
    const paths = created.map((c) => c.relativePath).sort();
    expect(paths).toEqual([
      'references/checklist.md',
      'references/principles.md',
    ]);

    // description from files_index propagated to skill_file.description
    const principlesRow = created.find(
      (c) => c.relativePath === 'references/principles.md',
    );
    expect(principlesRow?.description).toBe('Core principles');
  });

  it('should reject when files_index references a missing path', async () => {
    const skillId = crypto.randomUUID();
    const skill = {
      id: skillId,
      code: 'c',
      name: 'n',
      description: 'd',
      status: 'draft',
      contentHash: null,
      manifestContent: '',
      tools: [],
    } as any;
    skillRepo.findById.mockResolvedValue(skill);

    const skillMd = [
      '---',
      'name: BadIndex',
      'description: References nonexistent path in zip',
      'version: 1',
      'files_index:',
      '  - path: references/does-not-exist.md',
      '    description: phantom',
      '---',
      '# body',
      '',
    ].join('\n');
    const zipBuffer = buildZip([
      { name: 'test-skill/SKILL.md', content: skillMd },
    ]);
    const hash = crypto.createHash('sha256').update(zipBuffer).digest('hex');
    storage.getObject.mockResolvedValue(zipBuffer);

    await expect(
      svc.confirmUpload({
        skillId,
        ossKey: `skills/${skillId}/${hash}.zip`,
        hash,
        sourceFormat: 'zip',
        code: 'c',
        name: 'BadIndex',
        description: 'References nonexistent path in zip',
        userId: 1,
      }),
    ).rejects.toThrow(/missing path|files_index|ENOENT|frontmatter/i);
  });

  it('should not create a new skill version row (no-versioning architecture)', async () => {
    // The point: confirmUpload is a pure overwrite on existing skill.
    // No skillRepo.create call should be made during overwrite.
    const skillId = crypto.randomUUID();
    const skill = {
      id: skillId,
      code: 'c',
      name: 'n',
      description: 'd',
      status: 'draft',
      contentHash: null,
      manifestContent: '',
      tools: [],
    } as any;
    skillRepo.findById.mockResolvedValue(skill);
    skillRepo.update.mockResolvedValue(skill as any);

    const skillMd = frontmatter(
      'TestName',
      'Long enough description here yes.',
      '',
    );
    const zipBuffer = buildZip([
      { name: 'test-skill/SKILL.md', content: skillMd },
    ]);
    const hash = crypto.createHash('sha256').update(zipBuffer).digest('hex');
    storage.getObject.mockResolvedValue(zipBuffer);

    await svc.confirmUpload({
      skillId,
      ossKey: `skills/${skillId}/${hash}.zip`,
      hash,
      sourceFormat: 'zip',
      code: 'c',
      name: 'TestName',
      description: 'Long enough description here yes.',
      userId: 1,
    });

    expect(skillRepo.create).not.toHaveBeenCalled();
  });

  // ★ Regression: empty/whitespace `code` must NOT be persisted as-is — DTO
  // should already reject, but the service is the last line of defense, so
  // we treat blank code as "not provided" and derive from name + hash.
  it('should derive code from name when code is blank/undefined', async () => {
    const skillId = crypto.randomUUID();
    const skill = {
      id: skillId,
      code: 'placeholder',
      name: 'Placeholder',
      description: 'Placeholder description',
      status: 'draft',
      contentHash: null,
      manifestContent: '',
      tools: [],
    } as any;
    skillRepo.findById.mockResolvedValue(skill);
    skillRepo.update.mockResolvedValue(skill as any);

    const skillMd = frontmatter(
      'Trading Principles',
      'Long enough description here yes.',
      '',
    );
    // ★ spec §2.1: SKILL.md 在 <slug>/ 下
    const zipBuffer = buildZip([
      { name: 'test-skill/SKILL.md', content: skillMd },
    ]);
    const hash = crypto.createHash('sha256').update(zipBuffer).digest('hex');
    storage.getObject.mockResolvedValue(zipBuffer);

    // case 1: code: '' (empty string — bypasses DTO, hits service)
    await svc.confirmUpload({
      skillId,
      ossKey: `skills/${skillId}/${hash}.zip`,
      hash,
      sourceFormat: 'zip',
      code: '',
      name: 'Trading Principles',
      description: 'Long enough description here yes.',
      userId: 1,
    });

    let updateArg = skillRepo.update.mock.calls[0][1];
    expect(updateArg.code).toMatch(/^trading-principles-[a-f0-9]{4}$/);
    expect(updateArg.code).not.toBe('');
    expect((updateArg.code ?? '').length).toBeGreaterThan(1);

    // case 2: code: undefined (the common path from the UI now)
    skillRepo.update.mockClear();
    await svc.confirmUpload({
      skillId,
      ossKey: `skills/${skillId}/${hash}.zip`,
      hash,
      sourceFormat: 'zip',
      code: undefined,
      name: 'Trading Principles',
      description: 'Long enough description here yes.',
      userId: 1,
    });
    updateArg = skillRepo.update.mock.calls[0][1];
    expect(updateArg.code).toMatch(/^trading-principles-[a-f0-9]{4}$/);

    // case 3: code: '   ' (whitespace) — must also fall back
    skillRepo.update.mockClear();
    await svc.confirmUpload({
      skillId,
      ossKey: `skills/${skillId}/${hash}.zip`,
      hash,
      sourceFormat: 'zip',
      code: '   ',
      name: 'Trading Principles',
      description: 'Long enough description here yes.',
      userId: 1,
    });
    updateArg = skillRepo.update.mock.calls[0][1];
    expect(updateArg.code).toMatch(/^trading-principles-[a-f0-9]{4}$/);

    // case 4: CJK-only name with no code — falls back to skill-<hash12>-<rand4>
    skillRepo.update.mockClear();
    await svc.confirmUpload({
      skillId,
      ossKey: `skills/${skillId}/${hash}.zip`,
      hash,
      sourceFormat: 'zip',
      code: undefined,
      name: '财报基础',
      description: 'Long enough description here yes.',
      userId: 1,
    });
    updateArg = skillRepo.update.mock.calls[0][1];
    expect(updateArg.code).toMatch(/^skill-[a-f0-9]{12}-[a-f0-9]{4}$/);
  });

  // ★ spec §2.2 / §3.1 白名单:<slug>/(references|templates|examples|assets)/
  // 之外的文件被忽略(不报 400,只是不入库),并 warn log。
  it('should ignore zip entries outside the references|templates|examples|assets whitelist', async () => {
    const skillId = crypto.randomUUID();
    const skill = {
      id: skillId,
      code: 'c',
      name: 'n',
      description: 'd',
      status: 'draft',
      contentHash: null,
      manifestContent: '',
      tools: [],
    } as any;
    skillRepo.findById.mockResolvedValue(skill);
    skillRepo.update.mockResolvedValue(skill as any);

    const skillMd = frontmatter(
      'WhitelistTest',
      'Long enough description here yes.',
      '',
    );
    const zipBuffer = buildZip([
      { name: 'test-skill/SKILL.md', content: skillMd },
      // 白名单内:应入库
      { name: 'test-skill/references/keep.md', content: '# kept' },
      // 白名单外:应被忽略,不报 400
      { name: 'test-skill/random/skip.md', content: '# skipped' },
      // 顶层散落文件(没有放在 <slug>/ 子目录下,本身算在 <slug> 下但子目录非白名单)
      { name: 'test-skill/stray.txt', content: '# stray' },
    ]);
    const hash = crypto.createHash('sha256').update(zipBuffer).digest('hex');
    storage.getObject.mockResolvedValue(zipBuffer);

    const out = await svc.confirmUpload({
      skillId,
      ossKey: `skills/${skillId}/${hash}.zip`,
      hash,
      sourceFormat: 'zip',
      code: 'c',
      name: 'WhitelistTest',
      description: 'Long enough description here yes.',
      userId: 1,
    });

    expect(out.filesCount).toBe(1);
    expect(fileRepo.create).toHaveBeenCalledTimes(1);
    const created = fileRepo.create.mock.calls[0][0];
    expect(created.relativePath).toBe('references/keep.md');
  });

  // ★ description 短字符串(如 "test")不能被 service fallback 静默替换
  it('should preserve short user-provided description (not override with frontmatter)', async () => {
    const skillId = crypto.randomUUID();
    const skill = {
      id: skillId,
      code: 'c',
      name: 'n',
      description: 'old desc',
      status: 'draft',
      contentHash: null, // 强制走完整 Phase 2,不命中 idempotent short-circuit
      manifestContent: '',
      tools: [],
    } as any;
    skillRepo.findById.mockResolvedValue(skill);
    skillRepo.update.mockResolvedValue(skill as any);

    const skillMd = frontmatter(
      'LongNameFromFrontmatter',
      'This is the LLM-facing description in frontmatter, much longer than ten chars.',
      '',
    );
    const zipBuffer = buildZip([
      { name: 'test-skill/SKILL.md', content: skillMd },
    ]);
    const hash = crypto.createHash('sha256').update(zipBuffer).digest('hex');
    storage.getObject.mockResolvedValue(zipBuffer);

    await svc.confirmUpload({
      skillId,
      ossKey: `skills/${skillId}/${hash}.zip`,
      hash,
      sourceFormat: 'zip',
      code: undefined,
      name: 'n',
      description: 'test', // 短描述 — 之前会被静默替换成 frontmatter
      userId: 1,
    });

    expect(skillRepo.update).toHaveBeenCalledTimes(1);
    const updateArg = skillRepo.update.mock.calls[0][1];
    // 用户的 "test" 必须保留,不变成 frontmatter 的版本
    expect(updateArg.description).toBe('test');
  });

  // ★ description 空字符串才 fallback 到 frontmatter
  it('should fall back to frontmatter description when user provides empty string', async () => {
    const skillId = crypto.randomUUID();
    const skill = {
      id: skillId,
      code: 'c',
      name: 'n',
      description: 'old desc',
      status: 'draft',
      contentHash: null,
      manifestContent: '',
      tools: [],
    } as any;
    skillRepo.findById.mockResolvedValue(skill);
    skillRepo.update.mockResolvedValue(skill as any);

    const skillMd = frontmatter(
      'NameFromFrontmatter',
      'Fallback description from frontmatter that is long enough.',
      '',
    );
    const zipBuffer = buildZip([
      { name: 'test-skill/SKILL.md', content: skillMd },
    ]);
    const hash = crypto.createHash('sha256').update(zipBuffer).digest('hex');
    storage.getObject.mockResolvedValue(zipBuffer);

    await svc.confirmUpload({
      skillId,
      ossKey: `skills/${skillId}/${hash}.zip`,
      hash,
      sourceFormat: 'zip',
      code: undefined,
      name: 'n',
      description: '', // 空字符串 → fallback
      userId: 1,
    });

    const updateArg = skillRepo.update.mock.calls[0][1];
    expect(updateArg.description).toBe(
      'Fallback description from frontmatter that is long enough.',
    );
  });

  // ★ spec §2.1: 顶层只允许 1 个目录
  it('should reject zip with multiple top-level directories', async () => {
    const skillId = crypto.randomUUID();
    const skill = {
      id: skillId,
      code: 'c',
      name: 'n',
      description: 'd',
      status: 'draft',
      contentHash: null,
      manifestContent: '',
      tools: [],
    } as any;
    skillRepo.findById.mockResolvedValue(skill);

    const zipBuffer = buildZip([
      { name: 'foo/SKILL.md', content: '# foo' },
      { name: 'bar/SKILL.md', content: '# bar' },
    ]);
    const hash = crypto.createHash('sha256').update(zipBuffer).digest('hex');
    storage.getObject.mockResolvedValue(zipBuffer);

    await expect(
      svc.confirmUpload({
        skillId,
        ossKey: `skills/${skillId}/${hash}.zip`,
        hash,
        sourceFormat: 'zip',
        code: 'c',
        name: 'n',
        description: 'description-long-enough',
        userId: 1,
      }),
    ).rejects.toThrow(/顶层目录/);
  });

  // ============================================================
  // Update path (D5/D6/D7/D9 + §3.4 optimistic lock) — Task 5
  // ============================================================

  describe('SkillUploadService — update path', () => {
    let eventRepo: jest.Mocked<SkillUpdateEventRepository>;

    beforeEach(() => {
      eventRepo = {
        create: jest
          .fn()
          .mockImplementation((i) => Promise.resolve({ id: 'ev1', ...i })),
        findBySkill: jest.fn(),
      } as any;
      svc = new SkillUploadService(
        storage,
        skillRepo,
        fileRepo,
        bindingRepo,
        config as any,
        eventRepo,
      );
    });

    it('should not create a placeholder row when createUploadUrl is called with an existing skillId', async () => {
      skillRepo.findById.mockResolvedValue({
        id: 's1',
        uploaderType: 'user_self',
        uploaderId: 42,
        status: 'published',
      } as any);

      const out = await svc.createUploadUrl({
        filename: 'pkg.zip',
        size: 1024,
        sourceFormat: 'zip',
        hash: 'h2',
        userId: 42,
        skillId: 's1',
      } as any);

      expect(skillRepo.create).not.toHaveBeenCalled();
      expect(out.skillId).toBe('s1');
      expect(storage.createUploadUrl).toHaveBeenCalledWith('s1', 'h2');
    });

    it('should throw NotFoundException when createUploadUrl is called with a missing skillId', async () => {
      skillRepo.findById.mockResolvedValue(null);
      await expect(
        svc.createUploadUrl({
          filename: 'pkg.zip',
          size: 1024,
          sourceFormat: 'zip',
          hash: 'h',
          userId: 1,
          skillId: 'missing',
        } as any),
      ).rejects.toThrow(/not found/i);
    });

    it('should write skill_update_event when confirmUpload is called with isUpdate=true', async () => {
      // ★ Note: hash must equal sha256 of mocked zip buffer so confirmUpload's
      // post-download hash re-check passes (see brief concern).
      const zipBuffer = Buffer.from(
        buildZip([
          {
            name: 'pkg/SKILL.md',
            content: frontmatter('x', 'desc-long-enough') + 'body',
          },
        ]),
      );
      const newHash = crypto
        .createHash('sha256')
        .update(zipBuffer)
        .digest('hex');

      skillRepo.findById.mockResolvedValue({
        id: 's1',
        code: 'c',
        uploaderType: 'user_self',
        uploaderId: 42,
        status: 'published',
        contentHash: 'oldHash',
        updatedAt: new Date('2026-08-22T00:00:00Z'),
        manifestContent: 'old',
        tools: [],
        uploaderType2: undefined,
      } as any);
      skillRepo.update.mockResolvedValue({ id: 's1' } as any);
      fileRepo.replaceForSkill.mockResolvedValue(0 as any);
      fileRepo.listBySkill.mockResolvedValue([]);
      fileRepo.create.mockResolvedValue({} as any);
      storage.getObject.mockResolvedValue(zipBuffer);

      await svc.confirmUpload({
        skillId: 's1',
        ossKey: `skills/s1/${newHash}.zip`,
        hash: newHash,
        sourceFormat: 'zip',
        name: 'pkg',
        description: 'desc',
        userId: 42,
        isUpdate: true,
        actorRole: 'self',
        changelog: 'fix typo',
        expectedUpdatedAt: undefined,
      } as any);

      expect(eventRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          skillId: 's1',
          actorUserId: 42,
          actorRole: 'self',
          action: 'update',
          oldHash: 'oldHash',
          newHash,
          ossKey: `skills/s1/${newHash}.zip`,
          sourceFormat: 'zip',
          changelog: 'fix typo',
        }),
      );
    });

    it('should preserve status (not force published) when confirmUpload is called with isUpdate=true', async () => {
      // ★ Note: hash must equal sha256 of mocked zip buffer (see brief concern).
      const zipBuffer = Buffer.from(
        buildZip([
          {
            name: 'pkg/SKILL.md',
            content: frontmatter('x', 'desc-long-enough') + 'body',
          },
        ]),
      );
      const newHash = crypto
        .createHash('sha256')
        .update(zipBuffer)
        .digest('hex');

      skillRepo.findById.mockResolvedValue({
        id: 's1',
        code: 'c',
        uploaderType: 'user_self',
        uploaderId: 42,
        status: 'archived',
        contentHash: 'old',
        updatedAt: new Date(),
        manifestContent: 'old',
        tools: [],
      } as any);
      skillRepo.update.mockResolvedValue({ id: 's1' } as any);
      fileRepo.replaceForSkill.mockResolvedValue(0 as any);
      fileRepo.listBySkill.mockResolvedValue([]);
      storage.getObject.mockResolvedValue(zipBuffer);

      await svc.confirmUpload({
        skillId: 's1',
        ossKey: `skills/s1/${newHash}.zip`,
        hash: newHash,
        sourceFormat: 'zip',
        name: 'x',
        description: 'd',
        userId: 42,
        isUpdate: true,
        actorRole: 'self',
      } as any);

      const updateArg = skillRepo.update.mock.calls[0][1];
      expect(updateArg.status).toBe('archived');
    });

    it('should throw ConflictException when confirmUpload isUpdate=true and expectedUpdatedAt mismatches skill.updatedAt', async () => {
      skillRepo.findById.mockResolvedValue({
        id: 's1',
        code: 'c',
        uploaderType: 'user_self',
        uploaderId: 42,
        status: 'published',
        contentHash: 'old',
        updatedAt: new Date('2026-08-22T00:00:00Z'),
        manifestContent: 'old',
        tools: [],
      } as any);

      await expect(
        svc.confirmUpload({
          skillId: 's1',
          ossKey: 'k',
          hash: 'newHash',
          sourceFormat: 'zip',
          name: 'x',
          description: 'd',
          userId: 42,
          isUpdate: true,
          actorRole: 'self',
          expectedUpdatedAt: '2026-08-22T01:00:00Z', // mismatch
        } as any),
      ).rejects.toThrow(/modified by another request/);
    });

    it('should not write event when confirmUpload is called without isUpdate (original upload path unchanged)', async () => {
      // ★ Note: simulate a fresh-upload placeholder row so confirmUpload can run
      // past the findById 404 guard (see brief concern). contentHash=null +
      // manifestContent='' means the idempotent short-circuit is skipped.
      const zipBuffer = Buffer.from(
        buildZip([
          {
            name: 'pkg/SKILL.md',
            content: frontmatter('x', 'desc-long-enough') + 'body',
          },
        ]),
      );
      const newHash = crypto
        .createHash('sha256')
        .update(zipBuffer)
        .digest('hex');

      skillRepo.findById.mockResolvedValue({
        id: 's1',
        code: 'placeholder',
        uploaderType: 'platform',
        uploaderId: 1,
        status: 'draft',
        contentHash: null,
        manifestContent: '',
        tools: [],
      } as any);
      skillRepo.create.mockResolvedValue({ id: 's1' } as any);
      skillRepo.update.mockResolvedValue({ id: 's1' } as any);
      fileRepo.replaceForSkill.mockResolvedValue(0 as any);
      fileRepo.listBySkill.mockResolvedValue([]);
      storage.getObject.mockResolvedValue(zipBuffer);

      await svc.confirmUpload({
        skillId: 's1',
        ossKey: `skills/s1/${newHash}.zip`,
        hash: newHash,
        sourceFormat: 'zip',
        name: 'x',
        description: 'd',
        userId: 1,
      } as any);

      expect(eventRepo.create).not.toHaveBeenCalled();
    });
  });
});
