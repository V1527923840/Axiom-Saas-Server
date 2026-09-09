import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RagChunksService } from './rag-chunks.service';
import { ResolveResult } from './domain/rag-chunk';

@ApiTags('RagChunks')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'rag-chunks',
  version: '1',
})
export class RagChunksController {
  constructor(private readonly ragChunksService: RagChunksService) {}

  @Get(':chunkId/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resolve a RAG chunk_id to source_table + source_row_id',
  })
  async resolve(
    @Param('chunkId', ParseIntPipe) chunkId: number,
  ): Promise<{ data: ResolveResult | null }> {
    return this.ragChunksService.resolveChunk(chunkId);
  }
}