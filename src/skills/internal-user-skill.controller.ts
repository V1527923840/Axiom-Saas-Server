import {
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse, ApiParam, ApiTags } from '@nestjs/swagger';
import { ServiceTokenGuard } from './service-token.guard';
import {
  CallerContext,
  InternalSkillToolService,
} from './internal-skill-tool.service';
import { SkillSummaryDto } from './dto/internal-user-skill.dto';

/**
 * Minimal request shape exposed by ServiceTokenGuard.
 * `callerContext` is attached by the guard (see service-token.guard.ts).
 */
interface InternalUserSkillRequest extends Request {
  callerContext?: CallerContext;
}

/**
 * InternalUserSkillController — VibeTrading-facing per-user skill list.
 *
 * ★ Architecture (plan §A1 + Task 1): vibe calls this on every
 * `POST /sessions/{id}/messages` so its system prompt always reflects
 * the user's current enabled bindings. Latency budget = LAN < 50ms;
 * the controller is intentionally minimal (no extra round-trips, no
 * post-processing) so the only real cost is the binding + skill lookup.
 *
 * Routes:
 *   GET /internal/users/:uid/skills
 *
 * Auth: ServiceTokenGuard. The guard parses
 * `Authorization: Bearer <SKILL_SERVICE_TOKEN>` + populates
 * `req.callerContext` from the `X-User-Id` / `X-Session-Id` /
 * `X-Attempt-Id` headers.
 *
 * ★ Security (SSRF / horizontal-authz defense): the `:uid` path
 * parameter MUST equal the `X-User-Id` header — vibe may only request
 * its own user. Mismatch → 403 (we never want a misconfigured caller
 * to silently enumerate another user's bindings).
 *
 * ★ Empty binding = `{ data: [] }`, NOT 404. Vibe wants to differentiate
 * "this user exists but has zero enabled skills" from "no such user".
 * Returning 404 on empty would force vibe to fail-soft on a healthy
 * user state.
 *
 * Per CLAUDE.md API format: arrays return `{ data: ... }`.
 * No `{success, data}` wrapper.
 */
@ApiTags('internal-users')
@UseGuards(ServiceTokenGuard)
@Controller({ path: 'internal/users', version: '1' })
export class InternalUserSkillController {
  constructor(private readonly toolService: InternalSkillToolService) {}

  // ============================================================
  // GET /internal/users/:uid/skills
  // ============================================================

  @ApiOkResponse({
    schema: {
      example: {
        data: [
          {
            id: 'uuid',
            name: 'Trading Principles',
            description: 'Core principles',
            category: 'trading',
            tags: ['finance'],
            contentHash: 'sha256...',
            toolsCount: 2,
            manifestTokenEstimate: 100,
            totalTokenEstimate: 500,
          },
        ],
      },
    },
  })
  @Get(':uid/skills')
  @HttpCode(HttpStatus.OK)
  @ApiParam({
    name: 'uid',
    description: 'Numeric user id; must equal X-User-Id header.',
  })
  async listUserSkills(
    @Param('uid') uid: string,
    @Req() req: InternalUserSkillRequest,
  ): Promise<{ data: SkillSummaryDto[] }> {
    const ctx = this.callerContext(req);
    this.assertSelfLookup(uid, ctx);

    // Path param is numeric — coerced to number for the DB lookup.
    const numericUid = parseInt(uid, 10);
    if (!Number.isFinite(numericUid)) {
      throw new ForbiddenException(`invalid uid: '${uid}'`);
    }

    const skills = await this.toolService.listVisibleSkills(numericUid);
    return { data: skills };
  }

  // ============================================================
  // Helpers
  // ============================================================

  /**
   * ServiceTokenGuard always populates callerContext. If it's missing
   * (e.g. a future guard refactor drops the assignment) we still
   * need a context object so downstream code can rely on it.
   */
  private callerContext(req: InternalUserSkillRequest): CallerContext {
    return (
      req.callerContext ?? {
        userId: undefined,
        sessionId: undefined,
        attemptId: undefined,
      }
    );
  }

  /**
   * ★ Anti-SSRF / horizontal-authz defense.
   *
   * Vibe must only request its own user's bindings. The :uid path
   * parameter must match the `X-User-Id` header exactly. Mismatch →
   * 403, with a message that exposes nothing about either side.
   */
  private assertSelfLookup(uid: string, ctx: CallerContext): void {
    if (!ctx.userId || ctx.userId !== uid) {
      throw new ForbiddenException(
        `caller may only request its own user (X-User-Id mismatch)`,
      );
    }
  }
}
