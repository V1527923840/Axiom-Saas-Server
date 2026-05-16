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
  name: 'parse_task_logs',
})
export class ParseTaskLogsEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', nullable: false })
  scrape_log_id: string;

  @Index()
  @Column({ type: 'varchar', length: 64, nullable: false })
  source: string;

  @Index()
  @Column({ type: 'varchar', length: 128, nullable: false })
  version: string;

  @Column({ type: 'varchar', length: 512, nullable: false })
  source_file_key: string;

  @Column({ type: 'varchar', length: 256, nullable: true })
  source_filename: string | null;

  @Column({ type: 'varchar', length: 512, nullable: true })
  output_json_key: string | null;

  @Column({ type: 'varchar', length: 512, nullable: true })
  output_md_key: string | null;

  @Index()
  @Column({ type: 'varchar', length: 32, default: 'pending' })
  status: string;

  @Column({ type: 'text', nullable: true })
  error_message: string | null;

  @Column({ type: 'int', default: 0 })
  retry_count: number;

  @Column({ type: 'varchar', length: 128, nullable: true })
  parser: string | null;

  @Column({ type: 'bigint', nullable: true })
  parse_duration_ms: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  started_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  completed_at: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @Column({ type: 'jsonb', default: '{}', nullable: true })
  metadata: Record<string, any> | null;
}
