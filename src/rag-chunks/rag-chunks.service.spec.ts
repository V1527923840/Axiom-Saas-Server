import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { RagChunksService } from './rag-chunks.service';
import { RagChunkEntity } from './infrastructure/persistence/relational/entities/rag-chunk.entity';

type RepoMock = {
  findOne: jest.Mock;
};

const buildRepoMock = (row: RagChunkEntity | null): RepoMock => ({
  findOne: jest.fn().mockResolvedValue(row),
});

describe('RagChunksService', () => {
  let service: RagChunksService;

  async function makeService(repo: RepoMock): Promise<RagChunksService> {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        RagChunksService,
        { provide: getRepositoryToken(RagChunkEntity), useValue: repo },
      ],
    }).compile();
    return moduleRef.get(RagChunksService);
  }

  it('resolves zsxq_posts row → sourceRowId as UUID string', async () => {
    const repo = buildRepoMock({
      id: 117850,
      sourceTable: 'zsxq_posts',
      sourceRowId: 'e5da4b05-652d-4b6e-812d-9d',
    });
    service = await makeService(repo);

    const result = await service.resolveChunk(117850);

    expect(repo.findOne).toHaveBeenCalledWith({
      where: { id: 117850 },
      select: ['id', 'sourceTable', 'sourceRowId'],
    });
    expect(result).toEqual({
      data: {
        sourceTable: 'zsxq_posts',
        sourceRowId: 'e5da4b05-652d-4b6e-812d-9d',
      },
    });
  });

  it('resolves research_analysis row → sourceRowId cast to number', async () => {
    const repo = buildRepoMock({
      id: 42,
      sourceTable: 'research_analysis',
      sourceRowId: '12345',
    });
    service = await makeService(repo);

    const result = await service.resolveChunk(42);

    expect(result).toEqual({
      data: {
        sourceTable: 'research_analysis',
        sourceRowId: 12345,
      },
    });
    expect(typeof (result.data as any).sourceRowId).toBe('number');
  });

  it('returns data: null when chunk not found', async () => {
    const repo = buildRepoMock(null);
    service = await makeService(repo);

    const result = await service.resolveChunk(999999);

    expect(result).toEqual({ data: null });
  });

  it('throws BadRequestException on unknown source_table', async () => {
    const repo = buildRepoMock({
      id: 1,
      sourceTable: 'something_else',
      sourceRowId: 'x',
    });
    service = await makeService(repo);

    await expect(service.resolveChunk(1)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('throws BadRequestException when research_analysis sourceRowId is not numeric', async () => {
    const repo = buildRepoMock({
      id: 2,
      sourceTable: 'research_analysis',
      sourceRowId: 'not-a-number',
    });
    service = await makeService(repo);

    await expect(service.resolveChunk(2)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});