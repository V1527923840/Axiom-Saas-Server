import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'rag_chunks' })
export class RagChunkEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'chunk_id', type: 'bigint' })
  chunkId: number;

  @Column({ name: 'source_table', type: 'varchar', length: 64 })
  sourceTable: string;

  @Column({ name: 'source_row_id', type: 'varchar', length: 64 })
  sourceRowId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}