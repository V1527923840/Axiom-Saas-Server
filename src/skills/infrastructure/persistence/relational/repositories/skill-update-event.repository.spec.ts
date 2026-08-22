import { SkillUpdateEventRepository } from './skill-update-event.repository';
import { SkillUpdateEventEntity } from '../entities/skill-update-event.entity';

describe('SkillUpdateEventRepository (in-memory mock)', () => {
  let repo: SkillUpdateEventRepository;
  let store: SkillUpdateEventEntity[];

  beforeEach(() => {
    store = [];
    const mockRepo = {
      create: jest.fn((input: Partial<SkillUpdateEventEntity>) => {
        const e = {
          id: 'e1',
          createdAt: new Date(),
          ...input,
        } as SkillUpdateEventEntity;
        return e;
      }),
      save: jest.fn((e: SkillUpdateEventEntity) => {
        store.push(e);
        return Promise.resolve(e);
      }),
      find: jest.fn(({ where, order, take }: any) => {
        let rows = store.filter((s) => s.skillId === where.skillId);
        if (order?.createdAt === 'DESC') rows = [...rows].reverse();
        if (take) rows = rows.slice(0, take);
        return Promise.resolve(rows);
      }),
    };
    repo = new SkillUpdateEventRepository(mockRepo as any);
  });

  it('should create and find events for a skill in DESC order', async () => {
    await repo.create({
      skillId: 's1',
      actorUserId: 1,
      actorRole: 'self' as any,
      action: 'update' as any,
      ossKey: 'k1',
      oldHash: 'a',
      newHash: 'b',
      sourceFormat: 'zip' as any,
      changelog: 'fix',
    });
    await repo.create({
      skillId: 's1',
      actorUserId: 2,
      actorRole: 'admin' as any,
      action: 'archive' as any,
      changelog: 'spam',
    });

    const events = await repo.findBySkill('s1');
    expect(events).toHaveLength(2);
    expect(events[0].action).toBe('archive'); // newer
    expect(events[1].action).toBe('update');
  });

  it('should respect limit', async () => {
    for (let i = 0; i < 5; i++) {
      await repo.create({
        skillId: 's1',
        actorUserId: 1,
        actorRole: 'self' as any,
        action: 'update' as any,
        newHash: `h${i}`,
      });
    }
    const events = await repo.findBySkill('s1', 3);
    expect(events).toHaveLength(3);
  });
});
