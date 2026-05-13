import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryColumn,
  JoinColumn,
} from 'typeorm';
import { ContentItemEntity } from '../../../../../content/infrastructure/persistence/relational/entities/content-item.entity';
import { ContentCategoryEntity } from '../../../../../content/infrastructure/persistence/relational/entities/content-category.entity';

@Entity({ name: 'document_classifications' })
export class DocumentClassificationEntity {
  @PrimaryColumn({ type: 'uuid', name: 'content_item_id' })
  contentItemId: string;

  @ManyToOne(() => ContentItemEntity)
  @JoinColumn({ name: 'content_item_id' })
  contentItem?: ContentItemEntity;

  @PrimaryColumn({ type: 'uuid', name: 'category_id' })
  categoryId: string;

  @ManyToOne(() => ContentCategoryEntity)
  @JoinColumn({ name: 'category_id' })
  category?: ContentCategoryEntity;

  @Column({ type: 'float', nullable: true })
  confidence?: number | null;

  @Column({ type: 'boolean', default: false, name: 'manual_reviewed' })
  manualReviewed: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
