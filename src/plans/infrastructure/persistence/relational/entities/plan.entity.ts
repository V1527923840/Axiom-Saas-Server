import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

@Entity({
  name: 'plan',
})
export class PlanEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: String, nullable: false })
  name: string;

  @Index()
  @Column({ type: String, default: 'Lv0' })
  tier: string;

  @Index()
  @Column({ type: String, nullable: false })
  cycle: string;

  @Column({ type: 'int', default: 0 })
  pointsQuota: number;

  @Column({ type: 'int', default: 0 })
  chatQuota: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  promotionalPrice: number | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Index()
  @Column({ type: String, default: 'active' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
