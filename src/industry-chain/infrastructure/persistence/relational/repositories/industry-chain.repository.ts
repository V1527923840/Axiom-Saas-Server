// src/industry-chain/infrastructure/persistence/relational/repositories/industry-chain.repository.ts
import { Injectable } from '@nestjs/common';
import {
  L1Item,
  L2Item,
  ChainItem,
  VersionItem,
} from '../../../../domain/industry-chain';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export abstract class IndustryChainRepository {
  abstract findL1List(options: {
    paginationOptions: IPaginationOptions;
  }): Promise<{ data: L1Item[]; total: number }>;

  abstract findL2List(
    l1Code: string,
    options: { paginationOptions: IPaginationOptions },
  ): Promise<{ data: L2Item[]; total: number }>;

  abstract findChains(
    l2Code: string,
    options: { paginationOptions: IPaginationOptions },
  ): Promise<{ data: ChainItem[]; total: number }>;

  abstract findVersions(
    chainSlug: string,
    options: { paginationOptions: IPaginationOptions },
  ): Promise<{ data: VersionItem[]; total: number }>;
}
