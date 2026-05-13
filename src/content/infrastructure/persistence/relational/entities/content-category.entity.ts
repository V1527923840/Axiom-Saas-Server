import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

@Entity({ name: 'content_category' })
export class ContentCategoryEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: String, length: 100 })
  name: string;

  @Index()
  @Column({ type: String, length: 50, unique: true })
  code: string;

  @Index()
  @Column({ type: String, length: 32, nullable: true })
  layer?: string | null;

  @Index()
  @Column({ type: String, length: 64, nullable: true, name: 'parent_code' })
  parentCode?: string | null;

  @Column({ type: String, nullable: true })
  description?: string | null;

  @Column({ type: 'int', default: 0, name: 'sort_order' })
  sortOrder: number;

  @Column({ type: Boolean, default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
