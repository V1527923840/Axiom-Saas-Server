import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'rag_chunks' })
export class RagChunkEntity {
  /**
   * 外部 Python 服务(AxiomVibeTrading)分配的 chunk id,作为主键。
   * 不是数据库自增,不要用 @PrimaryGeneratedColumn。
   */
  @PrimaryColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'source_table', type: 'text' })
  sourceTable: string;

  @Column({ name: 'source_row_id', type: 'text' })
  sourceRowId: string;
}
