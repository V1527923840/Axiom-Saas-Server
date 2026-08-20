// src/industry-chain/industry-chain.service.spec.ts
import { Test } from '@nestjs/testing';
import { IndustryChainService } from './industry-chain.service';
import { IndustryChainRepository } from './infrastructure/persistence/relational/repositories/industry-chain.repository';

describe('IndustryChainService', () => {
  let service: IndustryChainService;
  let repo: jest.Mocked<IndustryChainRepository>;

  const paginationOptions = { page: 1, limit: 10 };

  beforeEach(async () => {
    const repoMock: Partial<jest.Mocked<IndustryChainRepository>> = {
      findL1List: jest.fn(),
      findL2List: jest.fn(),
      findChains: jest.fn(),
      findVersions: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        IndustryChainService,
        { provide: IndustryChainRepository, useValue: repoMock },
      ],
    }).compile();

    service = moduleRef.get(IndustryChainService);
    repo = moduleRef.get(
      IndustryChainRepository,
    ) as jest.Mocked<IndustryChainRepository>;
  });

  it('should delegate findL1List to repository', async () => {
    const expected = {
      data: [{ code: '110000', name: '农林牧渔', chainCount: 2 }],
      total: 1,
    };
    repo.findL1List.mockResolvedValue(expected);

    const result = await service.findL1List({ paginationOptions });

    expect(repo.findL1List).toHaveBeenCalledWith({ paginationOptions });
    expect(result).toEqual(expected);
  });

  it('should delegate findL2List to repository with l1 code', async () => {
    const expected = {
      data: [{ code: '110500', name: '农产品加工', chainCount: 1 }],
      total: 1,
    };
    repo.findL2List.mockResolvedValue(expected);

    const result = await service.findL2List('110000', { paginationOptions });

    expect(repo.findL2List).toHaveBeenCalledWith('110000', {
      paginationOptions,
    });
    expect(result).toEqual(expected);
  });

  it('should delegate findChains to repository with l2 code', async () => {
    const expected = {
      data: [
        {
          slug: 'soybean-crushing',
          name: '大豆压榨',
          createTime: new Date('2026-07-03T01:57:39Z'),
          versionCount: 1,
        },
      ],
      total: 1,
    };
    repo.findChains.mockResolvedValue(expected);

    const result = await service.findChains('110500', { paginationOptions });

    expect(repo.findChains).toHaveBeenCalledWith('110500', {
      paginationOptions,
    });
    expect(result).toEqual(expected);
  });

  it('should delegate findVersions to repository with chain slug', async () => {
    const expected = {
      data: [
        {
          id: 1,
          version: 1,
          createTime: new Date('2026-07-03T01:57:39Z'),
          qiniuUrl: 'https://example.com/chains/test.md',
        },
      ],
      total: 1,
    };
    repo.findVersions.mockResolvedValue(expected);

    const result = await service.findVersions('soybean-crushing', {
      paginationOptions,
    });

    expect(repo.findVersions).toHaveBeenCalledWith('soybean-crushing', {
      paginationOptions,
    });
    expect(result).toEqual(expected);
  });
});
