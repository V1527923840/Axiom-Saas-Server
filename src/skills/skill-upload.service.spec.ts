import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import AdmZip from 'adm-zip';
import { SkillUploadService } from './skill-upload.service';
import { SkillStorageService } from './infrastructure/storage/skill-storage.service';
import { SkillRepository } from './infrastructure/persistence/relational/repositories/skill.repository';
import { SkillFileRepository } from './infrastructure/persistence/relational/repositories/skill-file.repository';

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

    config = makeConfigStub();

    svc = new SkillUploadService(
      storage,
      skillRepo,
      fileRepo,
      bindingRepo,
      config as unknown as ConfigService,
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
    const zipBuffer = buildZip([
      { name: 'SKILL.md', content: skillMd },
      { name: 'files/principles.md', content: fileContent },
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

    // Files must have been replaced (deleted + recreated).
    expect(fileRepo.replaceForSkill).toHaveBeenCalledWith(skillId);
    expect(fileRepo.create).toHaveBeenCalledTimes(1);
    const created = fileRepo.create.mock.calls[0][0];
    expect(created.skillId).toBe(skillId);
    expect(created.relativePath).toBe('principles.md');
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
    const zipBuffer = buildZip([{ name: 'SKILL.md', content: malformed }]);
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
      'files_index:',
      '  - path: files/principles.md',
      '    description: Core principles',
      '  - path: files/checklist.md',
      '    description: Pre-trade checklist',
      '---',
      '# body',
      '',
    ].join('\n');
    const zipBuffer = buildZip([
      { name: 'SKILL.md', content: skillMd },
      { name: 'files/principles.md', content: '# Principles' },
      { name: 'files/checklist.md', content: '# Checklist' },
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
    expect(paths).toEqual(['checklist.md', 'principles.md']);

    // description from files_index propagated to skill_file.description
    const principlesRow = created.find(
      (c) => c.relativePath === 'principles.md',
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
      '  - path: files/does-not-exist.md',
      '    description: phantom',
      '---',
      '# body',
      '',
    ].join('\n');
    const zipBuffer = buildZip([{ name: 'SKILL.md', content: skillMd }]);
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
    const zipBuffer = buildZip([{ name: 'SKILL.md', content: skillMd }]);
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
});
