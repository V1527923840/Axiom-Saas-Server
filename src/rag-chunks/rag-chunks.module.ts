import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RagChunksController } from './rag-chunks.controller';
import { RagChunksService } from './rag-chunks.service';
import { RagChunkEntity } from './infrastructure/persistence/relational/entities/rag-chunk.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RagChunkEntity])],
  controllers: [RagChunksController],
  providers: [RagChunksService],
  exports: [RagChunksService],
})
export class RagChunksModule {}