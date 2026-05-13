import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'etl_jobs' })
export class EtlJobEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: String, length: 512, name: 'source_file' })
  sourceFile: string;

  @Index()
  @Column({ type: String, length: 128, nullable: true })
  parser?: string | null;

  @Column({ type: 'int', default: 0, name: 'total_items' })
  totalItems: number;

  @Column({ type: 'int', default: 0, name: 'success_items' })
  successItems: number;

  @Column({ type: 'int', default: 0, name: 'failed_items' })
  failedItems: number;

  @Index()
  @Column({ type: String, length: 32, default: 'pending' })
  status: string;

  @Column({ type: 'text', nullable: true, name: 'error_message' })
  errorMessage?: string | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'started_at' })
  startedAt?: Date | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'completed_at' })
  completedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
