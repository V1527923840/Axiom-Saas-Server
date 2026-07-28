// src/industry-chain/industry-chain.controller.spec.ts
import { Test } from '@nestjs/testing';
import { IndustryChainController } from './industry-chain.controller';
import { IndustryChainService } from './industry-chain.service';
import { MenuAccessGuard } from '../menus/menu-access.guard';

describe('IndustryChainController', () => {
  let controller: IndustryChainController;
  let service: jest.Mocked<IndustryChainService>;

  beforeEach(async () => {
    const serviceMock: Partial<jest.Mocked<IndustryChainService>> = {
      findL1List: jest.fn(),
      findL2List: jest.fn(),
      findChains: jest.fn(),
      findVersions: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [IndustryChainController],
      providers: [{ provide: IndustryChainService, useValue: serviceMock }],
    })
      .overrideGuard(MenuAccessGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = moduleRef.get(IndustryChainController);
    service = moduleRef.get(
      IndustryChainService,
    ) as jest.Mocked<IndustryChainService>;
  });

  it('should call service and return envelope for L1', async () => {
    service.findL1List.mockResolvedValue({
      data: [{ code: '110000', name: '农林牧渔', chainCount: 2 }],
      total: 1,
    });

    const result = await controller.findL1({ page: 1, pageSize: 10 } as any);

    expect(service.findL1List).toHaveBeenCalledWith({
      paginationOptions: { page: 1, limit: 10 },
    });
    expect(result).toEqual({
      data: [{ code: '110000', name: '农林牧渔', chainCount: 2 }],
      total: 1,
      page: 1,
      pageSize: 10,
    });
  });

  it('should call service with l1 code for L2', async () => {
    service.findL2List.mockResolvedValue({
      data: [{ code: '110500', name: '农产品加工', chainCount: 1 }],
      total: 1,
    });

    const result = await controller.findL2({
      l1: '110000',
      page: 1,
      pageSize: 10,
    } as any);

    expect(service.findL2List).toHaveBeenCalledWith('110000', {
      paginationOptions: { page: 1, limit: 10 },
    });
    expect(result.total).toBe(1);
  });

  it('should call service with l2 code for chains', async () => {
    service.findChains.mockResolvedValue({
      data: [
        {
          slug: 'soybean-crushing',
          name: '大豆压榨',
          createTime: new Date(),
          versionCount: 1,
        },
      ],
      total: 1,
    });

    const result = await controller.findChains({
      l2: '110500',
      page: 1,
      pageSize: 10,
    } as any);

    expect(service.findChains).toHaveBeenCalledWith('110500', {
      paginationOptions: { page: 1, limit: 10 },
    });
    expect(result.data[0].slug).toBe('soybean-crushing');
  });

  it('should call service with chain slug for versions', async () => {
    service.findVersions.mockResolvedValue({
      data: [
        {
          id: 1,
          version: 1,
          createTime: new Date(),
          qiniuUrl: 'https://cdn.example.com/test.md',
        },
      ],
      total: 1,
    });

    const result = await controller.findVersions({
      chain: 'soybean-crushing',
      page: 1,
      pageSize: 10,
    } as any);

    expect(service.findVersions).toHaveBeenCalledWith('soybean-crushing', {
      paginationOptions: { page: 1, limit: 10 },
    });
    expect(result.data[0].qiniuUrl).toContain('test.md');
  });
});
