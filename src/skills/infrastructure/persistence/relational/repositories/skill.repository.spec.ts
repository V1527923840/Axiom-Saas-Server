import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { In } from 'typeorm';
import { SkillEntity } from '../entities/skill.entity';
import { SkillRepository } from './skill.repository';

/**
 * SkillRepository spec.
 *
 * Per skill-plaza-execution-guide §5.1: entities use Postgres-only features
 * (timestamptz, partial unique index, jsonb). Tests use TypeORM mock pattern
 * (jest mock on the repository) instead of SQLite to avoid reproducing those
 * features in the test DB.
 */

type RepoMock = {
  findOne: jest.Mock;
  findBy: jest.Mock;
  find: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
  softDelete: jest.Mock;
};

function makeRepoMock(): RepoMock {
  return {
    findOne: jest.fn(),
    findBy: jest.fn(),
    find: jest.fn(),
    create: jest.fn((input: Partial<SkillEntity>) => input),
    save: jest.fn((entity: Partial<SkillEntity>) =>
      Promise.resolve({ id: entity.id ?? 'skill-id', ...entity }),
    ),
    softDelete: jest.fn(),
  };
}

describe('SkillRepository', () => {
  let repo: SkillRepository;
  let mock: RepoMock;

  beforeEach(async () => {
    mock = makeRepoMock();

    const module = await Test.createTestingModule({
      providers: [
        SkillRepository,
        {
          provide: getRepositoryToken(SkillEntity),
          useValue: mock,
        },
      ],
    }).compile();

    repo = module.get(SkillRepository);
  });

  it('should create a skill', async () => {
    const input = {
      code: 'test-skill',
      name: 'Test Skill',
      description: 'For testing',
      uploaderType: 'platform' as const,
    };

    const created = await repo.create(input);

    expect(mock.create).toHaveBeenCalledWith(input);
    expect(mock.save).toHaveBeenCalledTimes(1);
    expect(created.id).toBe('skill-id');
    expect(created.code).toBe('test-skill');
  });

  it('should find by id', async () => {
    mock.findOne.mockResolvedValue({ id: 's1', code: 'c' });

    const found = await repo.findById('s1');

    expect(mock.findOne).toHaveBeenCalledWith({ where: { id: 's1' } });
    expect(found?.id).toBe('s1');
  });

  it('should find by code', async () => {
    mock.findOne.mockResolvedValue({ id: 's1', code: 'find-me' });

    const found = await repo.findByCode('find-me');

    expect(mock.findOne).toHaveBeenCalledWith({ where: { code: 'find-me' } });
    expect(found?.code).toBe('find-me');
  });

  it('should return empty array when ids list is empty (findByIds)', async () => {
    const result = await repo.findByIds([]);
    expect(result).toEqual([]);
    expect(mock.findBy).not.toHaveBeenCalled();
  });

  it('should use In() in findByIds (not deprecated findByIds)', async () => {
    mock.findBy.mockResolvedValue([{ id: 's1' }, { id: 's2' }]);

    const result = await repo.findByIds(['s1', 's2']);

    expect(mock.findBy).toHaveBeenCalledWith({ id: In(['s1', 's2']) });
    expect(result).toHaveLength(2);
  });

  it('should list published skills', async () => {
    mock.find.mockResolvedValue([{ id: 's1', status: 'published' }]);

    const result = await repo.listPublished();

    expect(mock.find).toHaveBeenCalledWith({ where: { status: 'published' } });
    expect(result).toHaveLength(1);
  });

  it('should update and throw when skill missing', async () => {
    mock.findOne.mockResolvedValue(null);

    await expect(repo.update('missing', { name: 'X' })).rejects.toThrow(
      /skill missing not found/,
    );
  });

  it('should softDelete by id', async () => {
    await repo.softDelete('s1');
    expect(mock.softDelete).toHaveBeenCalledWith({ id: 's1' });
  });
});
