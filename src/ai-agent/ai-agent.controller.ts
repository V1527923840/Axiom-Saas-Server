import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  HttpStatus,
  HttpCode,
  HttpException,
  Sse,
  MessageEvent,
  BadRequestException,
  PayloadTooLargeException,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as path from 'path';
import { Observable } from 'rxjs';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AiAgentService } from './ai-agent.service';
import { VibeClientService } from './vibe-trading/vibe-client.service';
import { CreateGoalDto } from './vibe-trading/dto/create-goal.dto';
import { UpdateGoalDto } from './vibe-trading/dto/update-goal.dto';
import { UpdateGoalStatusDto } from './vibe-trading/dto/update-goal-status.dto';
import { AddGoalEvidenceDto } from './vibe-trading/dto/add-goal-evidence.dto';
import { CreateSwarmRunDto } from './vibe-trading/dto/swarm.dto';

// Minimal User shape required by this controller — avoids loading the
// full User class which transitively triggers databaseConfig() at
// import time. Keep aligned with `src/users/domain/user.ts`.
interface CurrentUserShape {
  id: number | string;
}
import { CreateSessionDto } from './dto/create-session.dto';
import { QuerySessionsDto } from './dto/query-sessions.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { SessionResponseDto } from './dto/session-response.dto';
import { infinityPagination } from '../utils/infinity-pagination';

@ApiBearerAuth()
@ApiTags('AI Agent')
@Controller({ path: 'ai-agent', version: '1' })
export class AiAgentController {
  constructor(
    private readonly aiAgentService: AiAgentService,
    private readonly vibeClient: VibeClientService,
  ) {}

  @Get('agents')
  @HttpCode(HttpStatus.OK)
  listAgents() {
    return { data: this.aiAgentService.listAgentTypes() };
  }

  @Post('sessions')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: CurrentUserShape,
    @Body() dto: CreateSessionDto,
  ) {
    const session = await this.aiAgentService.createSession(
      user.id,
      dto.agentType,
      dto.title,
    );
    return { success: true, data: SessionResponseDto.fromDomain(session) };
  }

  @Get('sessions')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async list(
    @CurrentUser() user: CurrentUserShape,
    @Query() query: QuerySessionsDto,
  ) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const result = await this.aiAgentService.listSessions(
      user.id,
      query.agentType,
      page,
      pageSize,
    );
    return infinityPagination(
      result.data.map(SessionResponseDto.fromDomain),
      { page, limit: pageSize },
      result.total,
    );
  }

  @Get('sessions/:id')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async getOne(@CurrentUser() user: CurrentUserShape, @Param('id') id: string) {
    const s = await this.aiAgentService.getSession(user.id, id);
    return { data: SessionResponseDto.fromDomain(s) };
  }

  @Delete('sessions/:id')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async remove(@CurrentUser() user: CurrentUserShape, @Param('id') id: string) {
    await this.aiAgentService.deleteSession(user.id, id);
    return { success: true, message: 'Session deleted' };
  }

  @Patch('sessions/:id')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async update(
    @CurrentUser() user: CurrentUserShape,
    @Param('id') id: string,
    @Body() dto: UpdateSessionDto,
  ) {
    const session = await this.aiAgentService.updateSession(user.id, id, dto);
    return { data: SessionResponseDto.fromDomain(session) };
  }

  @Get('sessions/:id/messages')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async getMessages(
    @CurrentUser() user: CurrentUserShape,
    @Param('id') id: string,
    @Query('cursor') cursor?: string,
  ) {
    const messages = await this.aiAgentService.getMessages(user.id, id, cursor);
    return { data: messages };
  }

  @Post('sessions/:id/messages')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async submitMessage(
    @CurrentUser() user: CurrentUserShape,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ) {
    const result = await this.aiAgentService.submitMessage(
      user.id,
      id,
      dto.content,
    );
    return { data: result };
  }

  @Get('sessions/:id/events')
  @UseGuards(AuthGuard('jwt'))
  @Sse()
  events(
    @CurrentUser() user: CurrentUserShape,
    @Param('id') id: string,
  ): Observable<MessageEvent> {
    const ac = new AbortController();
    // 客户端断开时 abort 上游流 —— 用 response 上的 close 事件
    // 注意:@Sse() 装饰器不能直接拿 @Res(), 通过 Observable teardown 处理
    return new Observable<MessageEvent>((subscriber) => {
      const inner = this.aiAgentService.streamEvents(user.id, id, ac.signal);
      const sub = inner.subscribe({
        next: (v) => subscriber.next(v),
        error: (e) => subscriber.error(e),
        complete: () => subscriber.complete(),
      });
      return () => {
        ac.abort();
        sub.unsubscribe();
        // 释放可能仍持有的 inflight 锁 —— 客户端断连时正常完成事件不会到达
        void this.aiAgentService.releaseSessionLock(id).catch(() => undefined);
      };
    });
  }

  @Post('sessions/:id/cancel')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async cancel(@CurrentUser() user: CurrentUserShape, @Param('id') id: string) {
    await this.aiAgentService.cancelSession(user.id, id);
    return { success: true, message: 'Session cancelled' };
  }

  // ---------------- Goal (passthrough) ----------------

  /**
   * Resolve a session and assert it has a remote (upstream vibe) id.
   * Mirrors the pattern used by submitMessage: sessions created via the
   * controller always have a remoteSessionId, so this only triggers when
   * an upstream row was written directly without going through createSession.
   */
  private async requireRemoteSessionId(
    user: CurrentUserShape,
    id: string,
  ): Promise<string> {
    const session = await this.aiAgentService.getSession(user.id, id);
    if (!session.remoteSessionId) {
      throw new HttpException(
        {
          statusCode: HttpStatus.CONFLICT,
          message: 'Session has no remote id yet',
        },
        HttpStatus.CONFLICT,
      );
    }
    return session.remoteSessionId;
  }

  @Post('sessions/:id/goal')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async createGoal(
    @CurrentUser() user: CurrentUserShape,
    @Param('id') id: string,
    @Body() dto: CreateGoalDto,
  ) {
    const remoteSessionId = await this.requireRemoteSessionId(user, id);
    return this.vibeClient.createGoal(remoteSessionId, dto);
  }

  @Get('sessions/:id/goal')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async getGoal(
    @CurrentUser() user: CurrentUserShape,
    @Param('id') id: string,
  ) {
    const remoteSessionId = await this.requireRemoteSessionId(user, id);
    const goal = await this.vibeClient.getGoal(remoteSessionId);
    return { data: goal };
  }

  @Patch('sessions/:id/goal')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async updateGoal(
    @CurrentUser() user: CurrentUserShape,
    @Param('id') id: string,
    @Body() dto: UpdateGoalDto,
  ) {
    const remoteSessionId = await this.requireRemoteSessionId(user, id);
    return this.vibeClient.updateGoal(remoteSessionId, dto);
  }

  @Post('sessions/:id/goal/evidence')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async addGoalEvidence(
    @CurrentUser() user: CurrentUserShape,
    @Param('id') id: string,
    @Body() dto: AddGoalEvidenceDto,
  ) {
    const remoteSessionId = await this.requireRemoteSessionId(user, id);
    return this.vibeClient.addGoalEvidence(remoteSessionId, dto);
  }

  @Patch('sessions/:id/goal/status')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async updateGoalStatus(
    @CurrentUser() user: CurrentUserShape,
    @Param('id') id: string,
    @Body() dto: UpdateGoalStatusDto,
  ) {
    const remoteSessionId = await this.requireRemoteSessionId(user, id);
    return this.vibeClient.updateGoalStatus(remoteSessionId, dto);
  }

  // ---------------- Swarm (passthrough) ----------------
  // 注意:presets 不挂 JWT,公开访问;其他 swarm 路由需要 JWT。

  @Get('swarm/presets')
  @HttpCode(HttpStatus.OK)
  async listSwarmPresets() {
    return this.vibeClient.listSwarmPresets();
  }

  @Post('swarm/runs')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async createSwarmRun(@Body() dto: CreateSwarmRunDto) {
    return this.vibeClient.createSwarmRun(dto.preset_name, dto.user_vars);
  }

  @Get('swarm/runs')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async listSwarmRuns(@Query('limit') limit?: string) {
    // Use isNaN check (not `|| 20`) so that `limit=0` parses to 0 then
    // gets clamped to 1, while undefined / non-numeric falls back to 20.
    const parsed = limit !== undefined ? Number(limit) : 20;
    const base = Number.isFinite(parsed) ? parsed : 20;
    const clamped = Math.min(Math.max(base, 1), 100);
    return this.vibeClient.listSwarmRuns(clamped);
  }

  @Get('swarm/runs/:id')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async getSwarmRun(@Param('id') id: string) {
    return this.vibeClient.getSwarmRun(id);
  }

  @Post('swarm/runs/:id/cancel')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async cancelSwarmRun(@Param('id') id: string) {
    return this.vibeClient.cancelSwarmRun(id);
  }

  @Post('swarm/runs/:id/retry')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async retrySwarmRun(@Param('id') id: string) {
    return this.vibeClient.retrySwarmRun(id);
  }

  // ---------------- File upload (multer) ----------------

  private static readonly MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

  private static readonly ALLOWED_UPLOAD_EXT = new Set([
    '.pdf',
    '.docx',
    '.xlsx',
    '.xls',
    '.pptx',
    '.csv',
    '.tsv',
    '.txt',
    '.md',
    '.log',
    '.json',
    '.yaml',
    '.yml',
    '.toml',
    '.html',
    '.xml',
    '.rst',
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.bmp',
    '.webp',
    '.tiff',
  ]);

  private static readonly BLOCKED_UPLOAD_EXT = new Set([
    '.exe',
    '.msi',
    '.bat',
    '.cmd',
    '.com',
    '.scr',
    '.app',
    '.dmg',
    '.so',
    '.dll',
    '.dylib',
    '.py',
    '.pyw',
    '.sh',
    '.bash',
    '.zsh',
    '.fish',
    '.ps1',
    '.yaml',
    '.yml',
    '.j2',
    '.jinja',
    '.jinja2',
    '.template',
    '.zip',
    '.rar',
    '.7z',
    '.tar',
    '.gz',
    '.tgz',
    '.bz2',
    '.xz',
  ]);

  @Post('upload')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: AiAgentController.MAX_UPLOAD_BYTES },
      // 浏览器 FormData 不在 multipart Content-Type 上声明 charset,
      // multer 把这个选项透传给 busboy(multer/lib/make-middleware.js:27,131)。
      // busboy 默认 defParamCharset = 'latin1',中文 UTF-8 字节被当成 Latin-1
      // 单字节解读,导致 file.originalname 在这里就已经乱码
      // (例如 `2-3 山东宏桥...pdf` 变成 `2-3 ã±ã, ã°...`),后续写到
      // response 的 filename 字段也是乱的,前端 chip/card 直接渲染乱码。
      // 显式设 'utf8' 是 SaaS Server 侧唯一修复点 —— 前端 wire shape 不需要改。
      //
      // 类型 cast:`@types/multer@2.1.0` 的 MulterOptions 没声明 defParamCharset,
      // 但 multer 2.1.1 runtime 明确支持(multer/lib/make-middleware.js:131 把
      // 它传给 busboy),因此这里用 `as any` 绕过类型层。后续 @types/multer
      // 升上来后可清理。
      ...({ defParamCharset: 'utf8' } as any),
    }),
  )
  @HttpCode(HttpStatus.OK)
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Missing file');
    if (file.size > AiAgentController.MAX_UPLOAD_BYTES) {
      throw new PayloadTooLargeException('File exceeds 50MB limit');
    }
    const ext = path.extname(file.originalname).toLowerCase();
    if (
      AiAgentController.BLOCKED_UPLOAD_EXT.has(ext) ||
      !AiAgentController.ALLOWED_UPLOAD_EXT.has(ext)
    ) {
      throw new BadRequestException(
        'This file type is not allowed for upload.',
      );
    }
    return this.vibeClient.uploadFile(
      file.buffer,
      file.originalname,
      file.mimetype,
    );
  }
}
