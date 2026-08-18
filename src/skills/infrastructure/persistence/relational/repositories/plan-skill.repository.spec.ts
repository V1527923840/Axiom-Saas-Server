import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PlanSkillEntity } from '../entities/plan-skill.entity';
import { PlanSkillRepository } from './plan-skill.repository';

type RepoMock = {
  find: jest.Mock;
  count: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
  delete: jest.Mock;
};

function makeRepoMock(): RepoMock {
  return {
    find: jest.fn(),
    count: jest.fn(),
    create: jest.fn((input: Partial<PlanSkillEntity>) => input),
    save: jest.fn((entity: Partial<PlanSkillEntity>) =>
      Promise.resolve({ id: 'plan-skill-id', ...entity }),
    ),
    delete: jest.fn(),
  };
}

describe('PlanSkillRepository', () => {
  let repo: PlanSkillRepository;
  let mock: RepoMock;

  beforeEach(async () => {
    mock = makeRepoMock();
    const module = await Test.createTestingModule({
      providers: [
        PlanSkillRepository,
        { provide: getRepositoryToken(PlanSkillEntity), useValue: mock },
      ],
    }).compile();
    repo = module.get(PlanSkillRepository);
  });

  it('should findByPlan with string planId (uuid)', async () => {
    mock.find.mockResolvedValue([{ planId: 'plan-uuid', skillId: 'sk-1' }]);

    const rows = await repo.findByPlan('plan-uuid');

    expect(mock.find).toHaveBeenCalledWith({ where: { planId: 'plan-uuid' } });
    expect(rows).toHaveLength(1);
  });

  it('should findEnabledByPlan only enabled rows', async () => {
    mock.find.mockResolvedValue([
      { planId: 'p1', skillId: 'sk-1', enabled: true },
    ]);

    const rows = await repo.findEnabledByPlan('p1');

    expect(mock.find).toHaveBeenCalledWith({
      where: { planId: 'p1', enabled: true },
    });
    expect(rows).toHaveLength(1);
  });

  it('should return true when skill is in plan', async () => {
    mock.count.mockResolvedValue(1);

    const inPlan = await repo.isInPlan('p1', 'sk-1');

    expect(mock.count).toHaveBeenCalledWith({
      where: { planId: 'p1', skillId: 'sk-1' },
    });
    expect(inPlan).toBe(true);
  });

  it('should return false when skill is not in plan', async () => {
    mock.count.mockResolvedValue(0);

    const inPlan = await repo.isInPlan('p1', 'sk-1');

    expect(inPlan).toBe(false);
  });

  it('should create a plan_skill row', async () => {
    const created = await repo.create({
      planId: 'p1',
      skillId: 'sk-1',
      enabled: true,
    });

    expect(mock.create).toHaveBeenCalledWith({
      planId: 'p1',
      skillId: 'sk-1',
      enabled: true,
    });
    expect(created.id).toBe('plan-skill-id');
  });

  it('should remove by composite key', async () => {
    await repo.remove('p1', 'sk-1');

    expect(mock.delete).toHaveBeenCalledWith({
      planId: 'p1',
      skillId: 'sk-1',
    });
  });
});
