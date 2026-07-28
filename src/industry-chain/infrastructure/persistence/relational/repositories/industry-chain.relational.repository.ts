// src/industry-chain/infrastructure/persistence/relational/repositories/industry-chain.relational.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IndustryChainQiniuRegistryEntity } from '../entities/industry-chain-qiniu-registry.entity';
import { IndustryChainRepository } from './industry-chain.repository';
import {
  ChainItem,
  L1Item,
  L2Item,
  VersionItem,
} from '../../../../domain/industry-chain';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class IndustryChainRelationalRepository extends IndustryChainRepository {
  constructor(
    @InjectRepository(IndustryChainQiniuRegistryEntity)
    private readonly registryRepository: Repository<IndustryChainQiniuRegistryEntity>,
  ) {
    super();
  }

  async findL1List({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }) {
    const qb = this.registryRepository
      .createQueryBuilder('r')
      .select('r.sw_l1_code', 'code')
      .addSelect('r.sw_l1_name', 'name')
      .addSelect('COUNT(DISTINCT r.chain_slug)', 'chainCount')
      .where('r.upload_status = :status', { status: 'success' })
      .groupBy('r.sw_l1_code')
      .addGroupBy('r.sw_l1_name')
      .orderBy('r.sw_l1_code', 'ASC')
      .offset((paginationOptions.page - 1) * paginationOptions.limit)
      .limit(paginationOptions.limit);

    const [rows, total] = await Promise.all([
      qb.getRawMany<L1Item>(),
      this.registryRepository
        .createQueryBuilder('r')
        .select('COUNT(DISTINCT r.sw_l1_code)', 'cnt')
        .where('r.upload_status = :status', { status: 'success' })
        .getRawOne<{ cnt: string }>(),
    ]);

    return {
      data: rows.map((r) => ({
        code: r.code,
        name: r.name,
        chainCount: Number(r.chainCount),
      })),
      total: Number(total?.cnt ?? 0),
    };
  }

  async findL2List(
    l1Code: string,
    { paginationOptions }: { paginationOptions: IPaginationOptions },
  ) {
    const qb = this.registryRepository
      .createQueryBuilder('r')
      .select('r.sw_l2_code', 'code')
      .addSelect('r.sw_l2_name', 'name')
      .addSelect('COUNT(DISTINCT r.chain_slug)', 'chainCount')
      .where('r.upload_status = :status', { status: 'success' })
      .andWhere('r.sw_l1_code = :l1', { l1: l1Code })
      .groupBy('r.sw_l2_code')
      .addGroupBy('r.sw_l2_name')
      .orderBy('r.sw_l2_code', 'ASC')
      .offset((paginationOptions.page - 1) * paginationOptions.limit)
      .limit(paginationOptions.limit);

    const [rows, total] = await Promise.all([
      qb.getRawMany<L2Item>(),
      this.registryRepository
        .createQueryBuilder('r')
        .select('COUNT(DISTINCT r.sw_l2_code)', 'cnt')
        .where('r.upload_status = :status', { status: 'success' })
        .andWhere('r.sw_l1_code = :l1', { l1: l1Code })
        .getRawOne<{ cnt: string }>(),
    ]);

    return {
      data: rows.map((r) => ({
        code: r.code,
        name: r.name,
        chainCount: Number(r.chainCount),
      })),
      total: Number(total?.cnt ?? 0),
    };
  }

  async findChains(
    l2Code: string,
    { paginationOptions }: { paginationOptions: IPaginationOptions },
  ) {
    const qb = this.registryRepository
      .createQueryBuilder('r')
      .select('r.chain_slug', 'slug')
      .addSelect('r.chain_name', 'name')
      .addSelect('MIN(r.frontmatter_create_time)', 'createTime')
      .addSelect('COUNT(*)', 'versionCount')
      .where('r.upload_status = :status', { status: 'success' })
      .andWhere('r.sw_l2_code = :l2', { l2: l2Code })
      .groupBy('r.chain_slug')
      .addGroupBy('r.chain_name')
      .orderBy('r.chain_slug', 'ASC')
      .offset((paginationOptions.page - 1) * paginationOptions.limit)
      .limit(paginationOptions.limit);

    const [rows, total] = await Promise.all([
      qb.getRawMany<ChainItem>(),
      this.registryRepository
        .createQueryBuilder('r')
        .select('COUNT(DISTINCT r.chain_slug)', 'cnt')
        .where('r.upload_status = :status', { status: 'success' })
        .andWhere('r.sw_l2_code = :l2', { l2: l2Code })
        .getRawOne<{ cnt: string }>(),
    ]);

    return {
      data: rows.map((r) => ({
        slug: r.slug,
        name: r.name,
        createTime: r.createTime,
        versionCount: Number(r.versionCount),
      })),
      total: Number(total?.cnt ?? 0),
    };
  }

  async findVersions(
    chainSlug: string,
    { paginationOptions }: { paginationOptions: IPaginationOptions },
  ) {
    const [rows, total] = await this.registryRepository.findAndCount({
      where: { chainSlug, uploadStatus: 'success' },
      select: ['id', 'version', 'frontmatterCreateTime', 'qiniuUrl'],
      order: { version: 'DESC' },
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return {
      data: rows.map<VersionItem>((r) => ({
        id: Number(r.id),
        version: r.version,
        createTime: r.frontmatterCreateTime as Date,
        qiniuUrl: r.qiniuUrl as string,
      })),
      total,
    };
  }
}
