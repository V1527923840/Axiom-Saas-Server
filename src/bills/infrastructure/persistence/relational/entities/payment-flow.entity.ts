import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

@Entity({
  name: 'payment_flow',
})
export class PaymentFlowEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'int', nullable: false })
  userId: number;

  @Column({ type: String, length: 100, nullable: false })
  userName: string;

  @Column({ type: String, length: 255, nullable: false })
  userEmail: string;

  @Index()
  @Column({ type: String, length: 100, unique: true, nullable: false })
  orderNo: string;

  @Column({ type: String, length: 20, nullable: false })
  type: string;

  @Column({ type: String, length: 20, nullable: false })
  paymentMethod: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  amount: number;

  @Column({ type: 'int', nullable: false })
  points: number;

  @Index()
  @Column({ type: String, length: 20, default: 'pending' })
  status: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date | null;
}
