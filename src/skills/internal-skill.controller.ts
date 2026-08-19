import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ServiceTokenGuard } from './service-token.guard';
import { InternalSkillToolService } from './internal-skill-tool.service';
import {
  InternalSkillContentHashQueryDto,
  InternalSkillExecuteToolDto,
  InternalSkillFileContentQueryDto,
} from './dto/internal-skill.dto';
import { CallerContext } from './internal-skill-tool.service';

/**
 * Minimal request shape exposed by ServiceTokenGuard.
 * `callerContext` is attached by the guard (see service-token.guard.ts).
 */
interface InternalSkillRequest extends Request {
  callerContext?: CallerContext;
}

/**
 * InternalSkillController — Service-to-Service API for VibeTrading.
 *
 * Routes (per execution guide §5.1 / spec §6.5 / Task 16 brief):
 *   GET  /internal/skills/:id/meta?contentHash=X
 *   GET  /internal/skills/:id/manifest?contentHash=X
 *   GET  /internal/skills/:id/files/content?contentHash=X&path=Y
 *   POST /internal/skills/:id/tools/:toolName/execute
 *
 * Auth: every route goes through ServiceTokenGuard (NOT JWT — internal
 * callers are not human). The guard attaches `callerContext` (userId
 * / sessionId / attemptId) read from the `X-User-Id` / `X-Session-Id`
 * / `X-Attempt-Id` headers.
 *
 * ★ Architecture: NO VERSIONING. `content_hash` is the cache key.
 *
 * ★ Security: the execute endpoint enforces multiple defenses
 * (audit C-3). The tool is rejected if:
 *   1. toolName is not in `skill.tools[].name`
 *   2. tool.endpoint_path is not in `ToolEndpointWhitelist`
 *   3. `args` fail validation against `tool.params_schema` (Ajv)
 *   4. per-user/per-tool rate limit (skill_tool.rate_limit_rps) is hit
 *
 * Per CLAUDE.md API format: single objects return `{data: ...}`.
 * No `{success, data}` wrapper.
 */
@ApiTags('internal-skills')
@UseGuards(ServiceTokenGuard)
@Controller({ path: 'internal/skills', version: '1' })
export class InternalSkillController {
  constructor(private readonly toolService: InternalSkillToolService) {}

  // ============================================================
  // GET /internal/skills/:id/meta?contentHash=X
  // ============================================================

  @ApiOkResponse({
    schema: {
      example: {
        data: {
          id: 'uuid',
          name: 'Trading Principles',
          description: '...',
          category: 'trading',
          tags: ['finance'],
          contentHash: 'sha256...',
          manifestTokenEstimate: 100,
          totalTokenEstimate: 500,
          toolsCount: 2,
          files: [
            {
              relativePath: 'principles.md',
              description: 'Core principles',
              tokenEstimate: 50,
            },
          ],
        },
      },
    },
  })
  @Get(':id/meta')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', format: 'uuid' })
  async getMeta(
    @Param('id') id: string,
    @Query() query: InternalSkillContentHashQueryDto,
    @Req() req: InternalSkillRequest,
  ): Promise<{ data: unknown }> {
    const ctx = this.callerContext(req);
    const meta = await this.toolService.getMeta(id, query.contentHash, ctx);
    return { data: meta };
  }

  // ============================================================
  // GET /internal/skills/:id/manifest?contentHash=X
  // ============================================================

  @ApiOkResponse({
    schema: {
      example: { data: { content: '---\nname: Trading\n---\n# body' } },
    },
  })
  @Get(':id/manifest')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', format: 'uuid' })
  async getManifest(
    @Param('id') id: string,
    @Query() query: InternalSkillContentHashQueryDto,
    @Req() req: InternalSkillRequest,
  ): Promise<{ data: { content: string } }> {
    const ctx = this.callerContext(req);
    const { content } = await this.toolService.getManifest(
      id,
      query.contentHash,
      ctx,
    );
    return { data: { content } };
  }

  // ============================================================
  // GET /internal/skills/:id/files/content?contentHash=X&path=Y
  // ============================================================

  @ApiOkResponse({
    schema: {
      example: { data: { content: '# Principles file content...' } },
    },
  })
  @Get(':id/files/content')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', format: 'uuid' })
  async getFileContent(
    @Param('id') id: string,
    @Query() query: InternalSkillFileContentQueryDto,
    @Req() req: InternalSkillRequest,
  ): Promise<{ data: { content: string } }> {
    const ctx = this.callerContext(req);
    const { content } = await this.toolService.getFileContent(
      id,
      query.contentHash,
      query.path,
      ctx,
    );
    return { data: { content } };
  }

  // ============================================================
  // GET /internal/skills/:id/zip
  // ★ Task 7 fix: PlazaCache lazy zip download.
  // No :uid consistency check (ServiceTokenGuard is the only auth,
  // the zip endpoint is not bound to a specific user). No binding
  // check — vibe PlazaCache validates `sid ∈ requested_skills` on
  // its own side. SaaS only checks the skill's own status.
  // ============================================================

  @ApiOperation({
    summary: 'Download full skill zip (for PlazaCache lazy download)',
  })
  @Get(':id/zip')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', format: 'uuid' })
  async getSkillZip(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StreamableFile> {
    const { buffer, downloadFilename } = await this.toolService.getSkillZip(
      id,
    );

    return new StreamableFile(buffer, {
      type: 'application/zip',
      disposition: `attachment; filename="${downloadFilename}.zip"`,
    });
  }

  // ============================================================
  // POST /internal/skills/:id/tools/:toolName/execute
  // ★ Audit C-3: multiple security gates — see service for details.
  // ============================================================

  @ApiOkResponse({
    schema: {
      example: {
        data: { skillId: 'uuid', toolName: 'get_price', status: 'authorized' },
      },
    },
  })
  @Post(':id/tools/:toolName/execute')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiParam({ name: 'toolName', example: 'get_price' })
  async executeTool(
    @Param('id') id: string,
    @Param('toolName') toolName: string,
    @Query() query: InternalSkillContentHashQueryDto,
    @Body() body: InternalSkillExecuteToolDto,
    @Req() req: InternalSkillRequest,
  ): Promise<{ data: unknown }> {
    const ctx = this.callerContext(req);
    const result = await this.toolService.executeTool(
      id,
      query.contentHash,
      toolName,
      body.args,
      ctx,
    );
    return { data: result.data };
  }

  // ============================================================
  // Helpers
  // ============================================================

  /**
   * ServiceTokenGuard always populates callerContext. If it's missing
   * (e.g. a future guard refactor drops the assignment) we still
   * need a context object so downstream code can rely on it.
   */
  private callerContext(req: InternalSkillRequest): CallerContext {
    return (
      req.callerContext ?? {
        userId: undefined,
        sessionId: undefined,
        attemptId: undefined,
      }
    );
  }
}
