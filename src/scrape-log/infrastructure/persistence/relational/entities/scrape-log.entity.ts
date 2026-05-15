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
  name: 'scrape_log',
})
export class ScrapeLogEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 50, nullable: false })
  source: string;

  @Index()
  @Column({ type: 'timestamptz', nullable: false })
  targettime: Date;

  @Index()
  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: string;

  @Column({ type: 'int', default: 0 })
  filecount: number;

  @Column({ type: 'int', default: 0 })
  postcount: number;

  @Column({ type: 'timestamptz', nullable: true })
  latestposttime: Date | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  osspath: string | null;

  @Column({ type: 'text', nullable: true })
  errormessage: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  startedat: Date;

  @Column({ type: 'timestamptz', nullable: true })
  completedat: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdat: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedat: Date;
}
