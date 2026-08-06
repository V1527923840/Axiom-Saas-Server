// The production entity (ai-session.entity.ts) declares `timestamptz` columns
// which SQLite does not support, so this spec exercises the concrete
// repository against a mock `Repository<AiSessionEntity>` that captures
// the calls TypeORM would make. Production schema (migration 1785993544614)
// is the source of truth for the partial unique + TTL indexes; this test
// only verifies the repository's create + findById + softDelete wiring.
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiSessionEntity } from '../entities/ai-session.entity';
import { RelationalAiSessionRepository } from './ai-session.repository';

type SavedRecord = { entity: AiSessionEntity; returned: AiSessionEntity };

function makeEntity(overrides: Partial<AiSessionEntity> = {}): AiSessionEntity {
  const e = new AiSessionEntity();
  e.id = (overrides.id as string) ?? '11111111-1111-1111-1111-111111111111';
  e.userId = (overrides.userId as number) ?? 1;
  e.agentType = overrides.agentType ?? 'vibe-trading';
  e.remoteSessionId = overrides.remoteSessionId ?? null;
  e.title = overrides.title ?? null;
  e.status = overrides.status ?? 'active';
  e.lastActiveAt = overrides.lastActiveAt ?? new Date('2026-01-01T00:00:00Z');
  e.expiresAt = overrides.expiresAt ?? new Date('2026-01-31T00:00:00Z');
  e.quotaCount = overrides.quotaCount ?? 0;
  e.quotaDate = overrides.quotaDate ?? new Date('2026-01-01');
  e.inflightStartedAt = overrides.inflightStartedAt ?? null;
  e.createdAt = overrides.createdAt ?? new Date('2026-01-01T00:00:00Z');
  e.updatedAt = overrides.updatedAt ?? new Date('2026-01-01T00:00:00Z');
  e.deletedAt = overrides.deletedAt ?? null;
  return e;
}

interface MockRepo {
  create: jest.Mock;
  save: jest.Mock;
  findOne: jest.Mock;
  find: jest.Mock;
  softDelete: jest.Mock;
}

function buildMockRepo(): MockRepo {
  const saved: SavedRecord[] = [];

  const matchRow = (row: AiSessionEntity, where: any): boolean => {
    for (const k of Object.keys(where)) {
      if ((row as any)[k] !== where[k]) return false;
    }
    return true;
  };

  return {
    create: jest.fn((data: any) => {
      return { ...makeEntity(), ...(data as object) } as AiSessionEntity;
    }),
    save: jest.fn((...args: any[]) => {
      // TypeORM's save is overloaded; collapse to a single entity for the test.
      const entity = (Array.isArray(args[0]) ? args[0][0] : args[0]) as
        | AiSessionEntity
        | undefined;
      if (!entity) return Promise.resolve(entity as any);
      if (!entity.id) entity.id = '22222222-2222-2222-2222-222222222222';
      const now = new Date();
      if (!entity.createdAt) entity.createdAt = now;
      entity.updatedAt = now;
      saved.push({ entity, returned: entity });
      return Promise.resolve(entity as any);
    }),
    findOne: jest.fn((args: any) => {
      const where = args?.where ?? {};
      for (let i = saved.length - 1; i >= 0; i--) {
        const row = saved[i].returned;
        if (row.deletedAt) continue;
        if (matchRow(row, where)) return Promise.resolve(row);
      }
      return Promise.resolve(null);
    }),
    find: jest.fn(() => Promise.resolve(saved.map((s) => s.returned))),
    softDelete: jest.fn((args: any) => {
      const where = (args as object) ?? {};
      for (const s of saved) {
        if (matchRow(s.returned, where)) s.returned.deletedAt = new Date();
      }
      return Promise.resolve({ raw: [], affected: 1 } as any);
    }),
  };
}

describe('RelationalAiSessionRepository', () => {
  let repo: RelationalAiSessionRepository;
  let mockRepo: MockRepo;

  beforeEach(async () => {
    mockRepo = buildMockRepo();

    const moduleRef = await Test.createTestingModule({
      providers: [
        RelationalAiSessionRepository,
        {
          provide: getRepositoryToken(AiSessionEntity),
          useValue: mockRepo as unknown as Repository<AiSessionEntity>,
        },
      ],
    }).compile();

    repo = moduleRef.get(RelationalAiSessionRepository);
  });

  it('should create and find by id', async () => {
    const userId = 1;
    const now = new Date();
    const created = await repo.create({
      userId,
      agentType: 'vibe-trading',
      status: 'active',
      quotaCount: 0,
      quotaDate: now,
      lastActiveAt: now,
      expiresAt: new Date(now.getTime() + 30 * 86400_000),
      remoteSessionId: null,
      title: null,
      inflightStartedAt: null,
    } as any);

    // create() should delegate to repo.create + repo.save in order.
    expect(mockRepo.create).toHaveBeenCalledTimes(1);
    expect(mockRepo.save).toHaveBeenCalledTimes(1);
    expect(created.id).toBeDefined();
    expect(created.userId).toBe(userId);

    const found = await repo.findById(created.id);
    expect(mockRepo.findOne).toHaveBeenCalledWith({
      where: { id: created.id },
    });
    expect(found).not.toBeNull();
    expect(found?.userId).toBe(userId);
    expect(found?.id).toBe(created.id);
    expect(found?.agentType).toBe('vibe-trading');
  });

  it('should soft delete by id', async () => {
    const now = new Date();
    const created = await repo.create({
      userId: 2,
      agentType: 'vibe-trading',
      status: 'active',
      quotaCount: 0,
      quotaDate: now,
      lastActiveAt: now,
      expiresAt: new Date(now.getTime() + 30 * 86400_000),
      remoteSessionId: null,
      title: null,
      inflightStartedAt: null,
    } as any);

    await repo.softDeleteById(created.id);
    expect(mockRepo.softDelete).toHaveBeenCalledWith({ id: created.id });

    const found = await repo.findById(created.id);
    expect(found).toBeNull();
  });
});
