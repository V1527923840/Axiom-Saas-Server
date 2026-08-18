import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SessionSkillMountEntity } from '../entities/session-skill-mount.entity';
import { SessionSkillMountRepository } from './session-skill-mount.repository';

type RepoMock = {
  find: jest.Mock;
  findOne: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
  delete: jest.Mock;
};

function makeRepoMock(): RepoMock {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(
      (input: Partial<SessionSkillMountEntity>) =>
        input as SessionSkillMountEntity,
    ),
    save: jest.fn((entity: Partial<SessionSkillMountEntity>) =>
      Promise.resolve({ id: 'mount-id', ...entity }),
    ),
    delete: jest.fn(),
  };
}

describe('SessionSkillMountRepository', () => {
  let repo: SessionSkillMountRepository;
  let mock: RepoMock;

  beforeEach(async () => {
    mock = makeRepoMock();
    const module = await Test.createTestingModule({
      providers: [
        SessionSkillMountRepository,
        {
          provide: getRepositoryToken(SessionSkillMountEntity),
          useValue: mock,
        },
      ],
    }).compile();
    repo = module.get(SessionSkillMountRepository);
  });

  it('should findBySession all mounts', async () => {
    mock.find.mockResolvedValue([{ sessionId: 'sess-1', skillId: 'sk-1' }]);

    const rows = await repo.findBySession('sess-1');

    expect(mock.find).toHaveBeenCalledWith({ where: { sessionId: 'sess-1' } });
    expect(rows).toHaveLength(1);
  });

  it('should upsert a new mount with no skillVersion', async () => {
    mock.findOne.mockResolvedValue(null);

    const result = await repo.upsert({
      sessionId: 'sess-1',
      skillId: 'sk-1',
      op: 'add',
      source: 'manual',
    });

    expect(mock.create).toHaveBeenCalledWith({
      sessionId: 'sess-1',
      skillId: 'sk-1',
      op: 'add',
      source: 'manual',
    });
    // ensure no version arg was added
    expect(mock.create.mock.calls[0][0]).not.toHaveProperty('skillVersion');
    expect(result.id).toBe('mount-id');
  });

  it('should update existing mount instead of inserting (upsert idempotent)', async () => {
    mock.findOne.mockResolvedValue({
      id: 'm1',
      op: 'remove',
      source: 'auto_matched',
    });

    await repo.upsert({
      sessionId: 'sess-1',
      skillId: 'sk-1',
      op: 'add',
      source: 'manual',
    });

    expect(mock.create).not.toHaveBeenCalled();
    expect(mock.save).toHaveBeenCalledTimes(1);
  });

  it('should remove mount by composite key', async () => {
    await repo.remove('sess-1', 'sk-1');

    expect(mock.delete).toHaveBeenCalledWith({
      sessionId: 'sess-1',
      skillId: 'sk-1',
    });
  });
});
