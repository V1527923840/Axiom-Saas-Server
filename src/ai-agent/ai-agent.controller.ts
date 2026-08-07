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
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AiAgentService } from './ai-agent.service';

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
  constructor(private readonly aiAgentService: AiAgentService) {}

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
}
