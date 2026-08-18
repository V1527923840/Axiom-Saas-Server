import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IsNull } from 'typeorm';
import { UserSkillBindingEntity } from '../entities/user-skill-binding.entity';
import { UserSkillBindingRepository } from './user-skill-binding.repository';

type RepoMock = {
  find: jest.Mock;
  findOne: jest.Mock;
  count: jest.Mock;
  save: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
};

function makeRepoMock(): RepoMock {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    save: jest.fn((entity: Partial<UserSkillBindingEntity>) =>
      Promise.resolve({ id: 'binding-id', ...entity }),
    ),
    create: jest.fn((input: Partial<UserSkillBindingEntity>) => input),
    update: jest.fn(),
  };
}

describe('UserSkillBindingRepository', () => {
  let repo: UserSkillBindingRepository;
  let mock: RepoMock;

  beforeEach(async () => {
    mock = makeRepoMock();
    const module = await Test.createTestingModule({
      providers: [
        UserSkillBindingRepository,
        {
          provide: getRepositoryToken(UserSkillBindingEntity),
          useValue: mock,
        },
      ],
    }).compile();
    repo = module.get(UserSkillBindingRepository);
  });

  it('should find enabled bindings for user', async () => {
    mock.find.mockResolvedValue([{ userId: 1, skillId: 's1' }]);

    const result = await repo.findEnabledByUser(1);

    expect(mock.find).toHaveBeenCalledWith({
      where: { userId: 1, status: 'enabled' },
      order: { enabledAt: 'DESC' },
    });
    expect(result).toHaveLength(1);
  });

  it('should return true when user has an enabled binding', async () => {
    mock.count.mockResolvedValue(1);

    const bound = await repo.isUserBound(1, 's1');

    expect(mock.count).toHaveBeenCalledWith({
      where: { userId: 1, skillId: 's1', status: 'enabled' },
    });
    expect(bound).toBe(true);
  });

  it('should return false when no enabled binding exists', async () => {
    mock.count.mockResolvedValue(0);

    const bound = await repo.isUserBound(1, 's1');

    expect(bound).toBe(false);
  });

  it('should create a new binding when none exists (enable)', async () => {
    mock.findOne.mockResolvedValue(null);

    await repo.enable({
      userId: 1,
      skillId: 's1',
      source: 'user_self',
      sourceRefId: null,
      enabledBy: 1,
    });

    expect(mock.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'enabled' }),
    );
    expect(mock.save).toHaveBeenCalledTimes(1);
  });

  it('should update existing binding to enabled (enable, idempotent)', async () => {
    mock.findOne.mockResolvedValue({
      id: 'b1',
      status: 'disabled',
      enabledBy: 2,
    });

    await repo.enable({
      userId: 1,
      skillId: 's1',
      source: 'user_self',
      sourceRefId: null,
      enabledBy: 1,
    });

    expect(mock.save).toHaveBeenCalledTimes(1);
    expect(mock.create).not.toHaveBeenCalled();
  });

  it('should disable a binding by composite key', async () => {
    mock.update.mockResolvedValue({ affected: 1 });

    await repo.disable(1, 's1', 'user_self', null);

    expect(mock.update).toHaveBeenCalledWith(
      {
        userId: 1,
        skillId: 's1',
        source: 'user_self',
        sourceRefId: IsNull(),
      },
      { status: 'disabled' },
    );
  });

  it('should disableByUserAndPlan', async () => {
    await repo.disableByUserAndPlan(1, 'plan-1');

    expect(mock.update).toHaveBeenCalledWith(
      {
        userId: 1,
        source: 'plan',
        sourceRefId: 'plan-1',
        status: 'enabled',
      },
      { status: 'disabled' },
    );
  });
});
