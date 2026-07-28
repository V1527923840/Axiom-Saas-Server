// src/industry-chain/infrastructure/persistence/relational/entities/industry-chain-qiniu-registry.entity.ts
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

@Entity({ name: 'industry_chain_qiniu_registry' })
export class IndustryChainQiniuRegistryEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Index()
  @Column({ name: 'sw_l1_code', type: 'varchar', length: 6 })
  swL1Code: string;

  @Column({ name: 'sw_l1_name', type: 'varchar', length: 64 })
  swL1Name: string;

  @Index()
  @Column({ name: 'sw_l2_code', type: 'varchar', length: 6 })
  swL2Code: string;

  @Column({ name: 'sw_l2_name', type: 'varchar', length: 64 })
  swL2Name: string;

  @Index()
  @Column({ name: 'chain_slug', type: 'varchar', length: 64 })
  chainSlug: string;

  @Column({ name: 'chain_name', type: 'varchar', length: 128 })
  chainName: string;

  @Column({ name: 'version', type: 'int' })
  version: number;

  @Column({ name: 'qiniu_url', type: 'varchar', length: 512, nullable: true })
  qiniuUrl: string | null;

  @Column({
    name: 'upload_status',
    type: 'varchar',
    length: 16,
    default: 'pending',
  })
  uploadStatus: string;

  @Column({
    name: 'frontmatter_create_time',
    type: 'timestamptz',
    nullable: true,
  })
  frontmatterCreateTime: Date | null;
}
