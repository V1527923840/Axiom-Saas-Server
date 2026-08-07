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
  HttpStatus,
  HttpCode,
  HttpException,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
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
@UseGuards(AuthGuard('jwt'))
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
  @HttpCode(HttpStatus.OK)
  async getOne(@CurrentUser() user: CurrentUserShape, @Param('id') id: string) {
    const s = await this.aiAgentService.getSession(user.id, id);
    return { data: SessionResponseDto.fromDomain(s) };
  }

  @Delete('sessions/:id')
  @HttpCode(HttpStatus.OK)
  async remove(@CurrentUser() user: CurrentUserShape, @Param('id') id: string) {
    await this.aiAgentService.deleteSession(user.id, id);
    return { success: true, message: 'Session deleted' };
  }

  @Patch('sessions/:id')
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
  // 注意:presets 不挂 JWT,单独放在 class 顶端、绕过 @UseGuards。
  // 当前 class 级别 @UseGuards(AuthGuard('jwt')) 仍会生效;@Public()
  // 仅为未来引入全局 Reflector-based guard 时的 marker。

  @Get('swarm/presets')
  @Public()
  async listSwarmPresets() {
    return this.vibeClient.listSwarmPresets();
  }

  @Post('swarm/runs')
  @HttpCode(HttpStatus.OK)
  async createSwarmRun(@Body() dto: CreateSwarmRunDto) {
    return this.vibeClient.createSwarmRun(dto.preset_name, dto.user_vars);
  }

  @Get('swarm/runs')
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
  @HttpCode(HttpStatus.OK)
  async getSwarmRun(@Param('id') id: string) {
    return this.vibeClient.getSwarmRun(id);
  }

  @Post('swarm/runs/:id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelSwarmRun(@Param('id') id: string) {
    return this.vibeClient.cancelSwarmRun(id);
  }

  @Post('swarm/runs/:id/retry')
  @HttpCode(HttpStatus.OK)
  async retrySwarmRun(@Param('id') id: string) {
    return this.vibeClient.retrySwarmRun(id);
  }
}
