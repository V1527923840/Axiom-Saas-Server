import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SkillFileEntity } from '../entities/skill-file.entity';
import { SkillFileRepository } from './skill-file.repository';

type RepoMock = {
  findOne: jest.Mock;
  find: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
  delete: jest.Mock;
};

function makeRepoMock(): RepoMock {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn((input: Partial<SkillFileEntity>) => input),
    save: jest.fn((entity: Partial<SkillFileEntity>) =>
      Promise.resolve({ id: 'file-id', ...entity }),
    ),
    delete: jest.fn(),
  };
}

describe('SkillFileRepository', () => {
  let repo: SkillFileRepository;
  let mock: RepoMock;

  beforeEach(async () => {
    mock = makeRepoMock();
    const module = await Test.createTestingModule({
      providers: [
        SkillFileRepository,
        { provide: getRepositoryToken(SkillFileEntity), useValue: mock },
      ],
    }).compile();
    repo = module.get(SkillFileRepository);
  });

  it('should findOne by skillId + relativePath (no versionId)', async () => {
    mock.findOne.mockResolvedValue({ id: 'f1', skillId: 's1' });

    const found = await repo.findOne('s1', 'principles.md');

    expect(mock.findOne).toHaveBeenCalledWith({
      where: { skillId: 's1', relativePath: 'principles.md' },
    });
    expect(found?.id).toBe('f1');
  });

  it('should return list index (no content) by skill', async () => {
    mock.find.mockResolvedValue([
      {
        relativePath: 'a.md',
        description: 'A',
        tokenEstimate: 100,
      },
      {
        relativePath: 'b.md',
        description: null,
        tokenEstimate: null,
      },
    ]);

    const index = await repo.listIndexBySkill('s1');

    expect(mock.find).toHaveBeenCalledWith({
      where: { skillId: 's1' },
      select: ['relativePath', 'description', 'tokenEstimate'],
      order: { sortOrder: 'ASC', relativePath: 'ASC' },
    });
    expect(index).toHaveLength(2);
    expect(index[0]).not.toHaveProperty('ossPath');
    expect(index[0]).not.toHaveProperty('contentHash');
    expect(index[0]).not.toHaveProperty('sizeBytes');
    expect(index[0].relativePath).toBe('a.md');
  });

  it('should create a skill_file row', async () => {
    const created = await repo.create({
      skillId: 's1',
      relativePath: 'r.md',
      ossPath: 'oss://x',
    });

    expect(mock.create).toHaveBeenCalledWith({
      skillId: 's1',
      relativePath: 'r.md',
      ossPath: 'oss://x',
    });
    expect(created.id).toBe('file-id');
  });

  it('should replaceForSkill return deleted count', async () => {
    mock.delete.mockResolvedValue({ affected: 3 });

    const n = await repo.replaceForSkill('s1');

    expect(mock.delete).toHaveBeenCalledWith({ skillId: 's1' });
    expect(n).toBe(3);
  });

  it('should default deleted count to 0 when affected is null', async () => {
    mock.delete.mockResolvedValue({ affected: null });

    const n = await repo.replaceForSkill('s1');

    expect(n).toBe(0);
  });
});
