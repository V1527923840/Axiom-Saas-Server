import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SkillLifecycleService } from './skill-lifecycle.service';
import { SkillRepository } from './infrastructure/persistence/relational/repositories/skill.repository';
import { SkillUpdateEventRepository } from './infrastructure/persistence/relational/repositories/skill-update-event.repository';

describe('SkillLifecycleService', () => {
  let svc: SkillLifecycleService;
  let skillRepo: jest.Mocked<SkillRepository>;
  let eventRepo: jest.Mocked<SkillUpdateEventRepository>;

  beforeEach(() => {
    skillRepo = {
      findById: jest.fn(),
      update: jest
        .fn()
        .mockImplementation((id, patch) =>
          Promise.resolve({ id, ...patch } as any),
        ),
    } as any;
    eventRepo = {
      create: jest.fn().mockResolvedValue({ id: 'ev1' }),
      findBySkill: jest.fn(),
    } as any;
    svc = new SkillLifecycleService(skillRepo, eventRepo);
  });

  describe('archive', () => {
    it('should throw NotFound when skill missing', async () => {
      skillRepo.findById.mockResolvedValue(null);
      await expect(svc.archive('s1', 1, 'admin')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should set status=archived and write event', async () => {
      skillRepo.findById.mockResolvedValue({
        id: 's1',
        status: 'published',
      } as any);
      const out = await svc.archive('s1', 7, 'admin', 'spam');
      expect(skillRepo.update).toHaveBeenCalledWith('s1', {
        status: 'archived',
      });
      expect(eventRepo.create).toHaveBeenCalledWith({
        skillId: 's1',
        actorUserId: 7,
        actorRole: 'admin',
        action: 'archive',
        changelog: 'spam',
      });
      expect(out.status).toBe('archived');
    });

    it('should be idempotent when already archived', async () => {
      skillRepo.findById.mockResolvedValue({
        id: 's1',
        status: 'archived',
      } as any);
      const out = await svc.archive('s1', 7, 'admin');
      expect(skillRepo.update).not.toHaveBeenCalled();
      expect(eventRepo.create).not.toHaveBeenCalled();
      expect(out.status).toBe('archived');
    });
  });

  describe('restore', () => {
    it('should set status=published and write event', async () => {
      skillRepo.findById.mockResolvedValue({
        id: 's1',
        status: 'archived',
      } as any);
      const out = await svc.restore('s1', 7, 'super_admin');
      expect(skillRepo.update).toHaveBeenCalledWith('s1', {
        status: 'published',
      });
      expect(eventRepo.create).toHaveBeenCalledWith({
        skillId: 's1',
        actorUserId: 7,
        actorRole: 'super_admin',
        action: 'restore',
        changelog: null,
      });
      expect(out.status).toBe('published');
    });

    it('should throw BadRequest when restoring a draft', async () => {
      skillRepo.findById.mockResolvedValue({
        id: 's1',
        status: 'draft',
      } as any);
      await expect(svc.restore('s1', 7, 'admin')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should be idempotent when already published', async () => {
      skillRepo.findById.mockResolvedValue({
        id: 's1',
        status: 'published',
      } as any);
      const out = await svc.restore('s1', 7, 'admin');
      expect(skillRepo.update).not.toHaveBeenCalled();
      expect(eventRepo.create).not.toHaveBeenCalled();
      expect(out.status).toBe('published');
    });
  });
});
