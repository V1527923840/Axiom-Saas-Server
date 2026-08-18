import { Logger } from '@nestjs/common';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InternalSkillToolService } from './internal-skill-tool.service';
import { SkillRepository } from './infrastructure/persistence/relational/repositories/skill.repository';
import { SkillFileRepository } from './infrastructure/persistence/relational/repositories/skill-file.repository';
import { SkillStorageService } from './infrastructure/storage/skill-storage.service';

/**
 * Spec for InternalSkillToolService — the read endpoints called by Vibe.
 *
 * Covers:
 *   - 3 endpoints (meta, manifest, file content)
 *   - toolsCount in meta response (audit C-2)
 *   - status='published' filter (audit I-3) → 403 if not published
 *   - Path traversal defense (audit C-3) — many negative cases
 *   - contentHash mismatch handling
 */
describe('InternalSkillToolService', () => {
  let svc: InternalSkillToolService;
  let skillRepo: jest.Mocked<SkillRepository>;
  let fileRepo: jest.Mocked<SkillFileRepository>;
  let storage: jest.Mocked<SkillStorageService>;

  const ctx = { userId: 'u1', sessionId: 's1', attemptId: 'a1' };

  function makeSkill(overrides: Partial<any> = {}): any {
    return {
      id: 'skill-1',
      code: 'sk1',
      name: 'Test Skill',
      description: 'A test skill',
      category: 'trading',
      tags: ['finance'],
      status: 'published',
      contentHash: 'abc123',
      manifestContent: '---\nname: Test\n---\n# body',
      manifestTokenEstimate: 100,
      totalTokenEstimate: 500,
      tools: [
        { name: 'get_price', description: 'Get price' },
        { name: 'get_news', description: 'Get news' },
      ],
      ...overrides,
    };
  }

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});

    skillRepo = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<SkillRepository>;

    fileRepo = {
      listIndexBySkill: jest.fn(),
      findOne: jest.fn(),
    } as unknown as jest.Mocked<SkillFileRepository>;

    storage = {
      getObject: jest.fn(),
    } as unknown as jest.Mocked<SkillStorageService>;

    svc = new InternalSkillToolService(skillRepo, fileRepo, storage);
  });

  // ============================================================
  // getMeta
  // ============================================================

  describe('getMeta', () => {
    it('should return meta with toolsCount derived from skill.tools jsonb', async () => {
      skillRepo.findById.mockResolvedValue(makeSkill());
      fileRepo.listIndexBySkill.mockResolvedValue([
        {
          relativePath: 'principles.md',
          description: 'Core principles',
          tokenEstimate: 50,
        },
      ]);

      const result = await svc.getMeta('skill-1', 'abc123', ctx);

      expect(result.id).toBe('skill-1');
      expect(result.name).toBe('Test Skill');
      expect(result.toolsCount).toBe(2); // ★ audit C-2
      expect(result.files).toHaveLength(1);
      expect(result.files[0].relativePath).toBe('principles.md');
    });

    it('should return toolsCount=0 when skill.tools is empty array', async () => {
      skillRepo.findById.mockResolvedValue(makeSkill({ tools: [] }));
      fileRepo.listIndexBySkill.mockResolvedValue([]);

      const result = await svc.getMeta('skill-1', 'abc123', ctx);

      expect(result.toolsCount).toBe(0);
    });

    it('should return toolsCount=0 when skill.tools is null/undefined (defensive)', async () => {
      skillRepo.findById.mockResolvedValue(makeSkill({ tools: null }));
      fileRepo.listIndexBySkill.mockResolvedValue([]);

      const result = await svc.getMeta('skill-1', 'abc123', ctx);

      expect(result.toolsCount).toBe(0);
    });

    it('should reject with NotFound when skill does not exist', async () => {
      skillRepo.findById.mockResolvedValue(null);

      await expect(svc.getMeta('missing', 'h', ctx)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('should reject with Forbidden when skill is draft (audit I-3)', async () => {
      skillRepo.findById.mockResolvedValue(makeSkill({ status: 'draft' }));

      await expect(svc.getMeta('s1', 'h', ctx)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('should reject with Forbidden when skill is archived (audit I-3)', async () => {
      skillRepo.findById.mockResolvedValue(makeSkill({ status: 'archived' }));

      await expect(svc.getMeta('s1', 'h', ctx)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('should reject with NotFound when contentHash mismatches', async () => {
      skillRepo.findById.mockResolvedValue(makeSkill({ contentHash: 'real' }));

      await expect(
        svc.getMeta('skill-1', 'wrong-hash', ctx),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should accept request when contentHash matches', async () => {
      skillRepo.findById.mockResolvedValue(makeSkill({ contentHash: 'real' }));
      fileRepo.listIndexBySkill.mockResolvedValue([]);

      const result = await svc.getMeta('skill-1', 'real', ctx);

      expect(result.id).toBe('skill-1');
    });

    it('should accept request when contentHash omitted (no cache key check)', async () => {
      skillRepo.findById.mockResolvedValue(makeSkill());
      fileRepo.listIndexBySkill.mockResolvedValue([]);

      const result = await svc.getMeta('skill-1', undefined, ctx);

      expect(result.id).toBe('skill-1');
    });
  });

  // ============================================================
  // getManifest
  // ============================================================

  describe('getManifest', () => {
    it('should return manifest content', async () => {
      skillRepo.findById.mockResolvedValue(
        makeSkill({ manifestContent: '---\nname: X\n---\n# body' }),
      );

      const result = await svc.getManifest('skill-1', 'abc123', ctx);

      expect(result.content).toContain('name: X');
    });

    it('should reject with NotFound when manifest content is empty', async () => {
      skillRepo.findById.mockResolvedValue(makeSkill({ manifestContent: '' }));

      await expect(svc.getManifest('s1', 'h', ctx)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('should reject with NotFound when skill does not exist', async () => {
      skillRepo.findById.mockResolvedValue(null);

      await expect(svc.getManifest('missing', 'h', ctx)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('should reject with Forbidden when skill is draft', async () => {
      skillRepo.findById.mockResolvedValue(makeSkill({ status: 'draft' }));

      await expect(svc.getManifest('s1', 'h', ctx)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });

  // ============================================================
  // getFileContent — including all path traversal negative cases
  // ============================================================

  describe('getFileContent', () => {
    it('should return file content when path is in skill_file list', async () => {
      skillRepo.findById.mockResolvedValue(makeSkill());
      fileRepo.findOne.mockResolvedValue({
        skillId: 'skill-1',
        relativePath: 'principles.md',
        ossPath: 'skills/skill-1/files/principles.md',
      } as any);
      storage.getObject.mockResolvedValue(Buffer.from('# Principles content'));

      const result = await svc.getFileContent(
        'skill-1',
        'abc123',
        'principles.md',
        ctx,
      );

      expect(result.content).toBe('# Principles content');
      expect(storage.getObject).toHaveBeenCalledWith(
        'skills/skill-1/files/principles.md',
      );
    });

    it('should reject with NotFound when path not in skill file list', async () => {
      skillRepo.findById.mockResolvedValue(makeSkill());
      fileRepo.findOne.mockResolvedValue(null);

      await expect(
        svc.getFileContent('skill-1', 'abc123', 'not-in-skill.md', ctx),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should reject with BadRequest when path is missing', async () => {
      await expect(
        svc.getFileContent('skill-1', 'abc123', undefined, ctx),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should reject with BadRequest when path is empty string', async () => {
      await expect(
        svc.getFileContent('skill-1', 'abc123', '', ctx),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    // ===== Path traversal defense (audit C-3) =====

    it('should reject path traversal with "../" (audit C-3)', async () => {
      await expect(
        svc.getFileContent('skill-1', 'abc123', '../etc/passwd', ctx),
      ).rejects.toBeInstanceOf(BadRequestException);

      // Crucially: must NOT call fileRepo or storage.
      expect(fileRepo.findOne).not.toHaveBeenCalled();
      expect(storage.getObject).not.toHaveBeenCalled();
    });

    it('should reject path traversal with multiple ".." segments', async () => {
      await expect(
        svc.getFileContent(
          'skill-1',
          'abc123',
          '../../../../../../etc/passwd',
          ctx,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(fileRepo.findOne).not.toHaveBeenCalled();
    });

    it('should reject path with embedded ".." even mid-path', async () => {
      await expect(
        svc.getFileContent('skill-1', 'abc123', 'files/../secret.md', ctx),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(fileRepo.findOne).not.toHaveBeenCalled();
    });

    it('should reject absolute path starting with / (audit C-3)', async () => {
      await expect(
        svc.getFileContent('skill-1', 'abc123', '/etc/passwd', ctx),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(fileRepo.findOne).not.toHaveBeenCalled();
    });

    it('should reject path with backslash separator', async () => {
      await expect(
        svc.getFileContent('skill-1', 'abc123', 'files\\..\\secret.md', ctx),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(fileRepo.findOne).not.toHaveBeenCalled();
    });

    it('should reject path with null byte injection', async () => {
      await expect(
        svc.getFileContent('skill-1', 'abc123', 'principles.md\0.txt', ctx),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(fileRepo.findOne).not.toHaveBeenCalled();
    });

    it('should reject path with percent-encoded traversal', async () => {
      await expect(
        svc.getFileContent('skill-1', 'abc123', '%2e%2e%2fpasswd', ctx),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(fileRepo.findOne).not.toHaveBeenCalled();
    });

    it('should reject path with percent-encoded slash', async () => {
      await expect(
        svc.getFileContent('skill-1', 'abc123', '%2fetc/passwd', ctx),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(fileRepo.findOne).not.toHaveBeenCalled();
    });

    // ===== Permission / status =====

    it('should reject with Forbidden when skill is draft', async () => {
      skillRepo.findById.mockResolvedValue(makeSkill({ status: 'draft' }));

      await expect(
        svc.getFileContent('skill-1', 'abc123', 'principles.md', ctx),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('should reject with NotFound when skill does not exist', async () => {
      skillRepo.findById.mockResolvedValue(null);

      await expect(
        svc.getFileContent('missing', 'abc123', 'principles.md', ctx),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should reject with NotFound when contentHash mismatches', async () => {
      skillRepo.findById.mockResolvedValue(makeSkill({ contentHash: 'real' }));

      await expect(
        svc.getFileContent('skill-1', 'wrong', 'principles.md', ctx),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
