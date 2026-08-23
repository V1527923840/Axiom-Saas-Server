import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SkillLifecycleService } from './skill-lifecycle.service';
import { SkillRepository } from './infrastructure/persistence/relational/repositories/skill.repository';
import { SkillUpdateEventRepository } from './infrastructure/persistence/relational/repositories/skill-update-event.repository';
import { SkillEntity } from './infrastructure/persistence/relational/entities/skill.entity';
import { SkillUpdateEventEntity } from './infrastructure/persistence/relational/entities/skill-update-event.entity';

describe('SkillLifecycleService', () => {
  let svc: SkillLifecycleService;
  let skillRepo: jest.Mocked<SkillRepository>;
  let eventRepo: jest.Mocked<SkillUpdateEventRepository>;
  let dataSource: jest.Mocked<DataSource>;

  // The transaction's EntityManager is mocked via the .transaction shim.
  let em: {
    findOne: jest.Mock;
    save: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let qb: {
    update: jest.Mock;
    set: jest.Mock;
    where: jest.Mock;
    execute: jest.Mock;
  };

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

    qb = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 0 }),
    };
    em = {
      findOne: jest.fn(),
      save: jest
        .fn()
        .mockImplementation((_entity, payload) => Promise.resolve(payload)),
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    };

    dataSource = {
      transaction: jest
        .fn()
        .mockImplementation((cb: (em: unknown) => unknown) =>
          Promise.resolve(cb(em)),
        ),
    } as any;

    svc = new SkillLifecycleService(skillRepo, eventRepo, dataSource);
  });

  describe('archive', () => {
    it('should throw NotFound when skill missing', async () => {
      em.findOne.mockResolvedValue(null);
      await expect(svc.archive('s1', 1, 'admin')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should set status=archived, write event, and cascade-disable bindings', async () => {
      em.findOne.mockResolvedValue({ id: 's1', status: 'published' } as any);
      const out = await svc.archive('s1', 7, 'admin', 'spam');

      // 1) status flip persisted through the EntityManager (not the
      //    bare repository — that would skip the transaction)
      expect(em.save).toHaveBeenCalledWith(SkillEntity, {
        id: 's1',
        status: 'archived',
      });

      // 2) audit event written
      expect(em.save).toHaveBeenCalledWith(
        SkillUpdateEventEntity,
        expect.objectContaining({
          skillId: 's1',
          actorUserId: 7,
          actorRole: 'admin',
          action: 'archive',
          changelog: 'spam',
        }),
      );

      // 3) bindings cascade-disabled inside the same transaction
      expect(em.createQueryBuilder).toHaveBeenCalledTimes(1);
      expect(qb.update).toHaveBeenCalled();
      expect(qb.set).toHaveBeenCalledWith({ status: 'disabled' });
      expect(qb.where).toHaveBeenCalledWith('skill_id = :id AND status = :s', {
        id: 's1',
        s: 'enabled',
      });
      expect(qb.execute).toHaveBeenCalled();

      expect(out.status).toBe('archived');
    });

    it('should be idempotent when already archived', async () => {
      em.findOne.mockResolvedValue({ id: 's1', status: 'archived' } as any);
      const out = await svc.archive('s1', 7, 'admin');
      // No writes — early return inside the transaction
      expect(em.save).not.toHaveBeenCalled();
      expect(em.createQueryBuilder).not.toHaveBeenCalled();
      expect(out.status).toBe('archived');
    });
  });

  describe('restore', () => {
    it('should set status=published and write event', async () => {
      em.findOne.mockResolvedValue({ id: 's1', status: 'archived' } as any);
      const out = await svc.restore('s1', 7, 'super_admin');

      expect(em.save).toHaveBeenCalledWith(SkillEntity, {
        id: 's1',
        status: 'published',
      });
      expect(em.save).toHaveBeenCalledWith(
        SkillUpdateEventEntity,
        expect.objectContaining({
          skillId: 's1',
          actorUserId: 7,
          actorRole: 'super_admin',
          action: 'restore',
          changelog: null,
        }),
      );
      expect(out.status).toBe('published');
    });

    it('should throw BadRequest when restoring a draft', async () => {
      em.findOne.mockResolvedValue({ id: 's1', status: 'draft' } as any);
      await expect(svc.restore('s1', 7, 'admin')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should be idempotent when already published', async () => {
      em.findOne.mockResolvedValue({ id: 's1', status: 'published' } as any);
      const out = await svc.restore('s1', 7, 'admin');
      expect(em.save).not.toHaveBeenCalled();
      expect(out.status).toBe('published');
    });
  });
});
