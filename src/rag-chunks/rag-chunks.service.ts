import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RagChunkEntity } from './infrastructure/persistence/relational/entities/rag-chunk.entity';
import { ResolveResult, SourceTable } from './domain/rag-chunk';

const VALID_SOURCE_TABLES: SourceTable[] = ['zsxq_posts', 'research_analysis'];

@Injectable()
export class RagChunksService {
  constructor(
    @InjectRepository(RagChunkEntity)
    private readonly repository: Repository<RagChunkEntity>,
  ) {}

  async resolveChunk(chunkId: number): Promise<{ data: ResolveResult | null }> {
    const row = await this.repository.findOne({ where: { chunkId } });
    if (!row) return { data: null };

    if (!VALID_SOURCE_TABLES.includes(row.sourceTable as SourceTable)) {
      throw new BadRequestException(
        `unknown source_table: ${row.sourceTable}`,
      );
    }

    return {
      data: {
        sourceTable: row.sourceTable as SourceTable,
        sourceRowId: this.castSourceRowId(
          row.sourceTable as SourceTable,
          row.sourceRowId,
        ),
      },
    };
  }

  private castSourceRowId(
    sourceTable: SourceTable,
    raw: string,
  ): string | number {
    if (sourceTable === 'research_analysis') {
      const n = Number(raw);
      if (!Number.isFinite(n)) {
        throw new BadRequestException(
          `invalid research_analysis source_row_id: ${raw}`,
        );
      }
      return n;
    }
    return raw; // zsxq_posts → UUID string
  }
}