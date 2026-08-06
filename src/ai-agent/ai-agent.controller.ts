import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  Sse,
  UseGuards,
  HttpStatus,
  HttpCode,
  MessageEvent,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AiAgentService } from './ai-agent.service';

// Minimal User shape required by this controller — avoids loading the
// full User class which transitively triggers databaseConfig() at
// import time. Keep aligned with `src/users/domain/user.ts`.
type CurrentUserShape = { id: number | string };
import { CreateSessionDto } from './dto/create-session.dto';
import { QuerySessionsDto } from './dto/query-sessions.dto';
import { SendMessageDto } from './dto/send-message.dto';
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

  @Sse('sessions/:id/messages')
  sendMessage(
    @CurrentUser() user: CurrentUserShape,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      void (async () => {
        try {
          for await (const chunk of this.aiAgentService.sendMessage(
            user.id,
            id,
            dto.content,
          )) {
            subscriber.next({ type: chunk.type, data: chunk.data });
          }
          subscriber.complete();
        } catch (e) {
          subscriber.next({
            type: 'error',
            data: { code: 'STREAM_ERROR', message: (e as Error).message },
          });
          subscriber.complete();
        }
      })();
    });
  }

  @Post('sessions/:id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(@CurrentUser() user: CurrentUserShape, @Param('id') id: string) {
    await this.aiAgentService.cancelSession(user.id, id);
    return { success: true, message: 'Session cancelled' };
  }
}
