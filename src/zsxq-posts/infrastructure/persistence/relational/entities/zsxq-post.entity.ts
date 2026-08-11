import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

/**
 * Read-only view of the Agent-managed zsxq_posts table. The SaaS side
 * never writes to this table — the Agent pipeline owns it end-to-end
 * (see migration 1781000001000-CreateZsxqClassificationTable). Only the
 * columns read by DailySummaryService.getSources are mapped here;
 * additional columns are still queryable via raw SQL but should be
 * added to this entity before any TypeORM code starts touching them.
 */
@Entity({ name: 'zsxq_posts' })
export class ZsxqPostEntity extends EntityRelationalHelper {
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  // TODO: migration 1781000001000 declared this column NOT NULL. The
  // entity has it nullable because some rows pre-dating the migration
  // exist with NULL (Agent side). Reconcile with the Agent team before
  // running `migration:generate` — otherwise it will emit
  // `DROP NOT NULL` against an Agent-owned table.
  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    name: 'source_file_key',
  })
  sourceFileKey?: string | null;

  @Column({ type: 'varchar', length: 50 })
  version: string;

  @Index()
  @Column({ type: 'date', name: 'post_date' })
  postDate: string;

  @Column({ type: 'varchar', length: 100, name: 'category_l1' })
  categoryL1: string;

  @Column({ type: 'varchar', length: 100, name: 'category_l2' })
  categoryL2: string;

  @Column({ type: 'text', nullable: true })
  summary?: string | null;

  @Column({ type: 'text', nullable: true })
  title?: string | null;
}
