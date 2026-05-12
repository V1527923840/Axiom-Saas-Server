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
  name: 'subscription',
})
export class SubscriptionEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'int', nullable: false })
  userId: number;

  @Index()
  @Column({ type: 'uuid', nullable: false })
  planId: string;

  @Column({ type: String, nullable: false })
  planName: string;

  @Index()
  @Column({ type: String, nullable: false })
  cycle: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price: number;

  @CreateDateColumn()
  subscribedAt: Date;

  @Index()
  @Column({ type: 'timestamptz', nullable: false })
  expiredAt: Date;

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
