// src/industry-chain/industry-chain.service.ts
import { Injectable } from '@nestjs/common';
import { IndustryChainRepository } from './infrastructure/persistence/relational/repositories/industry-chain.repository';
import {
  ChainItem,
  L1Item,
  L2Item,
  VersionItem,
} from './domain/industry-chain';
import { IPaginationOptions } from '../utils/types/pagination-options';

@Injectable()
export class IndustryChainService {
  constructor(
    private readonly industryChainRepository: IndustryChainRepository,
  ) {}

  findL1List({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<{ data: L1Item[]; total: number }> {
    return this.industryChainRepository.findL1List({ paginationOptions });
  }

  findL2List(
    l1Code: string,
    { paginationOptions }: { paginationOptions: IPaginationOptions },
  ): Promise<{ data: L2Item[]; total: number }> {
    return this.industryChainRepository.findL2List(l1Code, {
      paginationOptions,
    });
  }

  findChains(
    l2Code: string,
    { paginationOptions }: { paginationOptions: IPaginationOptions },
  ): Promise<{ data: ChainItem[]; total: number }> {
    return this.industryChainRepository.findChains(l2Code, {
      paginationOptions,
    });
  }

  findVersions(
    chainSlug: string,
    { paginationOptions }: { paginationOptions: IPaginationOptions },
  ): Promise<{ data: VersionItem[]; total: number }> {
    return this.industryChainRepository.findVersions(chainSlug, {
      paginationOptions,
    });
  }
}
