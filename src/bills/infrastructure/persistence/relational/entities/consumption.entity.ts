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
  name: 'consumption',
})
export class ConsumptionEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'int', nullable: false })
  userId: number;

  @Column({ type: String, length: 100, nullable: false })
  userName: string;

  @Column({ type: String, length: 255, nullable: false })
  userEmail: string;

  @Column({ type: String, length: 20, nullable: false })
  consumeType: string;

  @Column({ type: 'int', nullable: false })
  points: number;

  @Column({ type: 'int', nullable: false })
  balance: number;

  @Column({ type: String, length: 100, nullable: true })
  businessId: string | null;

  @Column({ type: String, length: 50, nullable: true })
  businessType: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
