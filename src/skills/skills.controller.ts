import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { MenuAccessGuard } from '../menus/menu-access.guard';
import { MenuPaths } from '../menus/menu-paths.decorator';
import { infinityPagination } from '../utils/infinity-pagination';
import {
  InfinityPaginationResponse,
  PaginatedApiResponseDto,
} from '../utils/dto/infinity-pagination-response.dto';

import { UsersService } from '../users/users.service';
import { SkillsService } from './skills.service';
import { SkillUploadService } from './skill-upload.service';
import { SkillLifecycleService } from './skill-lifecycle.service';
import { SkillUpdateEventRepository } from './infrastructure/persistence/relational/repositories/skill-update-event.repository';
import {
  assertCanArchiveOrRestore,
  assertCanUpdateSkill,
  type RoleFlags,
} from './skill-access';
import { CreateSkillUploadUrlDto } from './dto/create-skill-upload-url.dto';
import { ConfirmSkillContentDto } from './dto/confirm-skill-content.dto';
import { QuerySkillsDto } from './dto/query-skills.dto';
import { SkillContentHashQueryDto } from './dto/skill-content-query.dto';
import {
  ArchiveSkillDto,
  ListSkillUpdateEventsQueryDto,
  RestoreSkillDto,
  SkillUpdateEventDto,
  UpdateSkillUploadUrlOutputDto,
} from './dto/skill-update.dto';
import {
  MountSkillDto,
  MySkillDto,
  SessionSkillMountItemDto,
  SkillFileIndexDto,
  SkillResponseDto,
  SkillToolSummaryDto,
} from './dto/skill-response.dto';

/**
 * Minimal user shape on the JWT-authenticated request. Avoids pulling in
 * the full users module here — keeps the controller import-graph small.
 */
interface AuthenticatedRequest extends Request {
  user: { id: number | string };
}

/**
 * SkillsController — public REST API for Skill Plaza.
 *
 * Per spec §4.4 + audit C-1 (Task 15 brief) — 11 endpoints:
 *
 *  Admin (upload pipeline):
 *    POST /skills/upload-url               — phase 1 presigned URL
 *    PUT  /skills/{id}/content             — phase 2 idempotent overwrite
 *
 *  Reads:
 *    GET  /skills                          — paginated catalog
 *    GET  /skills/{id}                     — detail
 *    GET  /skills/{id}/files?contentHash=X — file metadata index
 *    GET  /skills/{id}/tools?contentHash=X — tool list from jsonb
 *
 *  User bindings:
 *    GET  /users/me/skills                 — caller's enabled set
 *    POST /skills/{id}/enable              — create user_self binding
 *    POST /skills/{id}/disable             — disable user_self binding
 *
 *  Session mounts:
 *    GET  /sessions/{id}/skills            — session-scoped mount list
 *    PUT  /sessions/{id}/skills/{skillId}  — mount / unmount skill
 *
 * ★ Audit C-1: phase 2 is PUT /skills/{id}/content, NOT POST /versions.
 *   PUT is idempotent (resendable) and matches the no-versioning decision.
 *
 * Routing note: the controller is split across two prefixes (`/skills`
 * and the user/sessions trees) because NestJS does not support
 * multi-prefix @Controller. We attach the explicit `/skills` path on
 * each route method so Swagger resolves them correctly.
 */
@ApiBearerAuth()
@ApiTags('Skills')
@UseGuards(AuthGuard('jwt'), MenuAccessGuard)
@Controller({ version: '1' })
export class SkillsController {
  constructor(
    private readonly skillsService: SkillsService,
    private readonly uploadService: SkillUploadService,
    private readonly lifecycleService: SkillLifecycleService,
    private readonly eventRepo: SkillUpdateEventRepository,
    private readonly usersService: UsersService,
  ) {}

  // ============================================================
  // Phase 1 + 2 — Admin upload pipeline (under /skills)
  // ============================================================

  @ApiCreatedResponse({
    schema: {
      example: {
        data: {
          uploadUrl: 'https://oss.example.com/...',
          key: 'skills/{id}/{hash}.zip',
          skillId: 'uuid',
        },
      },
    },
  })
  @Post('skills/upload-url')
  @HttpCode(HttpStatus.CREATED)
  @MenuPaths('/skills/admin')
  async createUploadUrl(
    @Body() body: CreateSkillUploadUrlDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<{
    data: { uploadUrl: string; key: string; skillId: string };
  }> {
    const userId = this.userIdOf(req);
    const out = await this.uploadService.createUploadUrl({
      filename: body.filename,
      size: body.size,
      sourceFormat: body.sourceFormat,
      hash: body.hash,
      userId,
    });
    return { data: out };
  }

  @ApiCreatedResponse({ type: UpdateSkillUploadUrlOutputDto })
  @Post('skills/:id/upload-url')
  @HttpCode(HttpStatus.CREATED)
  @MenuPaths('/skills/admin')
  @ApiParam({ name: 'id', format: 'uuid' })
  async createUpdateUploadUrl(
    @Param('id') id: string,
    @Body() body: CreateSkillUploadUrlDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ data: UpdateSkillUploadUrlOutputDto }> {
    const userId = this.userIdOf(req);
    const skill = await this.skillsService.findByIdRaw(id);
    if (!skill) throw new NotFoundException(`skill ${id} not found`);
    const flags = await this.resolveRoleFlags(userId);
    const actorRole = assertCanUpdateSkill(skill, userId, flags);
    const out = await this.uploadService.createUploadUrl({
      filename: body.filename,
      size: body.size,
      sourceFormat: body.sourceFormat,
      hash: body.hash,
      userId,
      skillId: id,
    });
    return {
      data: {
        uploadUrl: out.uploadUrl,
        key: out.key,
        skillId: out.skillId,
        cdnUrl: out.cdnUrl,
        expiresAt: out.expiresAt,
        updatedAt: skill.updatedAt.toISOString(),
        actorRole,
      },
    };
  }

  @ApiOkResponse({
    schema: {
      example: {
        data: { version: 1, skillId: 'uuid', filesCount: 3, toolsCount: 2 },
      },
    },
  })
  @Put('skills/:id/content')
  @HttpCode(HttpStatus.OK)
  @MenuPaths('/skills/admin')
  @ApiParam({ name: 'id', format: 'uuid' })
  async confirmContent(
    @Param('id') id: string,
    @Body() body: ConfirmSkillContentDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<{
    data: {
      version: 1;
      skillId: string;
      filesCount: number;
      toolsCount: number;
    };
  }> {
    const userId = this.userIdOf(req);
    const skill = await this.skillsService.findByIdRaw(id);
    if (!skill) throw new NotFoundException(`skill ${id} not found`);
    const flags = await this.resolveRoleFlags(userId);
    const actorRole = assertCanUpdateSkill(skill, userId, flags);
    const out = await this.uploadService.confirmUpload({
      skillId: id,
      ossKey: body.ossKey,
      hash: body.hash,
      sourceFormat: body.sourceFormat,
      code: body.code,
      name: body.name,
      description: body.description,
      changelog: body.changelog,
      category: body.category,
      userId,
      isUpdate: true,
      actorRole,
      expectedUpdatedAt: body.expectedUpdatedAt,
    });
    return { data: out };
  }

  // ============================================================
  // Reads (under /skills)
  // ============================================================

  @ApiOkResponse({
    type: InfinityPaginationResponse(SkillResponseDto),
  })
  @Get('skills')
  @HttpCode(HttpStatus.OK)
  @MenuPaths('/skills')
  async list(
    @Query() query: QuerySkillsDto,
  ): Promise<PaginatedApiResponseDto<SkillResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.pageSize ?? 20;

    const { data, total } = await this.skillsService.findManyWithPagination({
      page,
      pageSize: limit,
      status: query.status,
      category: query.category,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });

    const dtos = data.map((s) => this.skillsService.toResponseDtoPublic(s));

    return infinityPagination(dtos, { page, limit }, total);
  }

  @ApiOkResponse({ type: SkillResponseDto })
  @Get('skills/:id')
  @HttpCode(HttpStatus.OK)
  @MenuPaths('/skills')
  @ApiParam({ name: 'id', format: 'uuid' })
  async detail(@Param('id') id: string): Promise<SkillResponseDto> {
    return this.skillsService.findById(id);
  }

  @ApiOkResponse({ type: SkillFileIndexDto, isArray: true })
  @Get('skills/:id/files')
  @HttpCode(HttpStatus.OK)
  @MenuPaths('/skills')
  @ApiParam({ name: 'id', format: 'uuid' })
  async listFiles(
    @Param('id') id: string,
    @Query() query: SkillContentHashQueryDto,
  ): Promise<{ data: SkillFileIndexDto[] }> {
    const files = await this.skillsService.listFiles(id, query.contentHash);
    return { data: files };
  }

  @ApiOkResponse({ type: SkillToolSummaryDto, isArray: true })
  @Get('skills/:id/tools')
  @HttpCode(HttpStatus.OK)
  @MenuPaths('/skills')
  @ApiParam({ name: 'id', format: 'uuid' })
  async listTools(
    @Param('id') id: string,
    @Query() query: SkillContentHashQueryDto,
  ): Promise<{ data: SkillToolSummaryDto[] }> {
    const tools = await this.skillsService.listTools(id, query.contentHash);
    return { data: tools };
  }

  // ============================================================
  // User bindings (under /users/me)
  // ============================================================

  @ApiOkResponse({ type: MySkillDto, isArray: true })
  @Get('users/me/skills')
  @HttpCode(HttpStatus.OK)
  @MenuPaths('/skills')
  async listMySkills(
    @Req() req: AuthenticatedRequest,
  ): Promise<{ data: MySkillDto[] }> {
    const userId = this.userIdOf(req);
    const skills = await this.skillsService.listMySkills(userId);
    return { data: skills };
  }

  @ApiOkResponse({
    schema: { example: { data: { skillId: 'uuid', enabled: true } } },
  })
  @Post('skills/:id/enable')
  @HttpCode(HttpStatus.OK)
  @MenuPaths('/skills')
  @ApiParam({ name: 'id', format: 'uuid' })
  async enable(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ data: { skillId: string; enabled: true } }> {
    const userId = this.userIdOf(req);
    return this.skillsService.enableForUser(userId, id);
  }

  @ApiOkResponse({
    schema: { example: { data: { skillId: 'uuid', enabled: false } } },
  })
  @Post('skills/:id/disable')
  @HttpCode(HttpStatus.OK)
  @MenuPaths('/skills')
  @ApiParam({ name: 'id', format: 'uuid' })
  async disable(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ data: { skillId: string; enabled: false } }> {
    const userId = this.userIdOf(req);
    return this.skillsService.disableForUser(userId, id);
  }

  // ============================================================
  // Lifecycle (admin) — archive / restore / event log
  // ============================================================

  @ApiOkResponse({
    schema: { example: { data: { skillId: 'uuid', status: 'archived' } } },
  })
  @Post('skills/:id/archive')
  @HttpCode(HttpStatus.OK)
  @MenuPaths('/skills/admin')
  @ApiParam({ name: 'id', format: 'uuid' })
  async archive(
    @Param('id') id: string,
    @Body() body: ArchiveSkillDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ data: { skillId: string; status: 'archived' } }> {
    const userId = this.userIdOf(req);
    const skill = await this.skillsService.findByIdRaw(id);
    if (!skill) throw new NotFoundException(`skill ${id} not found`);
    const flags = await this.resolveRoleFlags(userId);
    const actorRole = assertCanArchiveOrRestore(skill, flags);
    await this.lifecycleService.archive(id, userId, actorRole, body.reason);
    return { data: { skillId: id, status: 'archived' } };
  }

  @ApiOkResponse({
    schema: { example: { data: { skillId: 'uuid', status: 'published' } } },
  })
  @Post('skills/:id/restore')
  @HttpCode(HttpStatus.OK)
  @MenuPaths('/skills/admin')
  @ApiParam({ name: 'id', format: 'uuid' })
  async restore(
    @Param('id') id: string,
    @Body() body: RestoreSkillDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ data: { skillId: string; status: 'published' } }> {
    const userId = this.userIdOf(req);
    const skill = await this.skillsService.findByIdRaw(id);
    if (!skill) throw new NotFoundException(`skill ${id} not found`);
    const flags = await this.resolveRoleFlags(userId);
    const actorRole = assertCanArchiveOrRestore(skill, flags);
    await this.lifecycleService.restore(id, userId, actorRole, body.reason);
    return { data: { skillId: id, status: 'published' } };
  }

  @ApiOkResponse({ type: SkillUpdateEventDto, isArray: true })
  @Get('skills/:id/updates')
  @HttpCode(HttpStatus.OK)
  @MenuPaths('/skills/admin')
  @ApiParam({ name: 'id', format: 'uuid' })
  async listUpdateEvents(
    @Param('id') id: string,
    @Query() query: ListSkillUpdateEventsQueryDto,
  ): Promise<{ data: SkillUpdateEventDto[] }> {
    const skill = await this.skillsService.findByIdRaw(id);
    if (!skill) throw new NotFoundException(`skill ${id} not found`);
    const events = await this.eventRepo.findBySkill(id, {
      limit: query.limit,
      before: query.before,
    });
    return {
      data: events.map((e) => ({
        id: e.id,
        action: e.action,
        actorUserId: e.actorUserId,
        actorRole: e.actorRole,
        ossKey: e.ossKey,
        oldHash: e.oldHash,
        newHash: e.newHash,
        sourceFormat: e.sourceFormat,
        changelog: e.changelog,
        createdAt: e.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Bookmark / favorite a skill (收藏). Idempotent.
   *
   * Distinct from `enable` (which both favorites AND activates). The
   * "收藏" button on the public plaza opens a confirm dialog that lets
   * the caller pick between this and `enable`. The disabled binding
   * still shows up in "我的 Skill" so users can find their bookmarks.
   */
  @ApiOkResponse({
    schema: {
      example: {
        data: { skillId: 'uuid', favorited: true, enabled: false },
      },
    },
  })
  @Post('skills/:id/favorite')
  @HttpCode(HttpStatus.OK)
  @MenuPaths('/skills')
  @ApiParam({ name: 'id', format: 'uuid' })
  async favorite(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<{
    data: { skillId: string; favorited: true; enabled: boolean };
  }> {
    const userId = this.userIdOf(req);
    return this.skillsService.favoriteForUser(userId, id);
  }

  /**
   * Remove a skill from the caller's personal collection ("我的 Skill" tab).
   *
   * Idempotent — if the binding is already absent, returns
   * `wasEnabled=false`. If it WAS enabled, the caller had to explicitly
   * confirm "停用并移除" via the UI; this endpoint just enforces the
   * resulting state.
   */
  @ApiOkResponse({
    schema: {
      example: {
        data: { skillId: 'uuid', removed: true, wasEnabled: false },
      },
    },
  })
  @Delete('users/me/skills/:id')
  @HttpCode(HttpStatus.OK)
  @MenuPaths('/skills')
  @ApiParam({ name: 'id', format: 'uuid' })
  async removeFromMySkills(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<{
    data: { skillId: string; removed: true; wasEnabled: boolean };
  }> {
    const userId = this.userIdOf(req);
    return this.skillsService.removeFromMyCollection(userId, id);
  }

  // ============================================================
  // Session mounts (under /sessions)
  // ============================================================

  @ApiOkResponse({ type: SessionSkillMountItemDto, isArray: true })
  @Get('sessions/:id/skills')
  @HttpCode(HttpStatus.OK)
  @MenuPaths('/skills')
  @ApiParam({ name: 'id', format: 'uuid' })
  async listSessionMounts(
    @Param('id') sessionId: string,
  ): Promise<{ data: SessionSkillMountItemDto[] }> {
    const mounts = await this.skillsService.listSessionMounts(sessionId);
    return { data: mounts };
  }

  @ApiOkResponse({
    schema: {
      example: {
        data: { sessionId: 'uuid', skillId: 'uuid', op: 'add' },
      },
    },
  })
  @Put('sessions/:id/skills/:skillId')
  @HttpCode(HttpStatus.OK)
  @MenuPaths('/skills')
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiParam({ name: 'skillId', format: 'uuid' })
  async mountSkill(
    @Param('id') sessionId: string,
    @Param('skillId') skillId: string,
    @Body() body: MountSkillDto,
  ): Promise<{
    data: { sessionId: string; skillId: string; op: 'add' | 'remove' };
  }> {
    return this.skillsService.setSessionMount(
      sessionId,
      skillId,
      body.op,
      body.source ?? 'manual',
    );
  }

  // ============================================================
  // Helpers
  // ============================================================

  private userIdOf(req: AuthenticatedRequest): number {
    const raw = req.user.id;
    return typeof raw === 'string' ? parseInt(raw, 10) : raw;
  }

  /**
   * Resolve role flags for a user. Used by endpoints that need to gate
   * by admin/super_admin/skill-author. Both flags are computed lazily
   * — for self-only paths we skip the admin checks.
   */
  private async resolveRoleFlags(userId: number): Promise<RoleFlags> {
    const isSuperAdmin = await this.usersService.isSuperAdmin(userId);
    const isAdmin = isSuperAdmin || (await this.usersService.isAdmin(userId));
    return { isSuperAdmin, isAdmin };
  }
}
