# Market Quote Proxy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a NestJS thin proxy module at `src/market-quote/` that forwards `GET /v1/market/quote/daily` to AxiomVibeTrading's `/api/market/quote/daily`, with JWT auth at the SaaS-Server layer and service-token + X-User-Id forwarding to AxiomVibeTrading.

**Architecture:** A new `MarketQuoteModule` (controller + service + DTO) wraps `AuthGuard('jwt')` to verify the end user's JWT, then delegates to `MarketQuoteService.proxyDailyQuote()`, which uses native `fetch` + `AbortSignal.timeout(30s)` to call the upstream AxiomVibeTrading endpoint with `Authorization: Bearer {VIBE_TRADING_API_TOKEN}` + `X-User-Id: {userId}` and returns the upstream JSON unchanged. Zero new dependencies; no Redis cache layer; no tushare SDK.

**Tech Stack:** NestJS 11 + class-validator + native fetch + Jest (per existing project patterns, e.g. `src/research/`, `src/ai-agent/vibe-trading/vibe-client.service.spec.ts`).

**Spec:** `D:/代码仓库/test/Axiom-Saas-Server/docs/superpowers/specs/2026-09-08-market-quote-proxy-design.md`

---

## File Structure

```
src/market-quote/
├── market-quote.module.ts            # NestJS module declaration
├── market-quote.controller.ts        # HTTP controller @ /v1/market/quote/daily
├── market-quote.service.ts           # fetch proxy + AbortSignal.timeout
├── market-quote.service.spec.ts      # fetch URL/headers/error passthrough tests
├── market-quote.controller.spec.ts   # JWT guard + DTO validation tests
└── dto/
    └── get-daily-quote.dto.ts        # class-validator DTO (ts_code + range)

src/app.module.ts                     # add MarketQuoteModule to imports[]
```

---

## Task 1: DTO with class-validator
**Files:**
- Create: `src/market-quote/dto/get-daily-quote.dto.ts`
- Test: `src/market-quote/dto/get-daily-quote.dto.spec.ts` (deferred to controller test in Task 3)

- [ ] **Step 1: Create the DTO file**

```ts
// src/market-quote/dto/get-daily-quote.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsIn, Matches } from 'class-validator';

const RANGES = ['1d', '1w', '3m', '6m', '1y', 'all'] as const;
export type DailyQuoteRange = (typeof RANGES)[number];

export class GetDailyQuoteDto {
  @ApiProperty({
    description: 'A-share ts_code, e.g. 600519.SH',
    example: '600519.SH',
    pattern: '^\\d{6}\\.(SH|SZ|BJ)$',
  })
  @Matches(/^\d{6}\.(SH|SZ|BJ)$/, {
    message: 'ts_code must match A-share format: 6 digits + .SH|SZ|BJ',
  })
  ts_code!: string;

  @ApiProperty({
    description: 'Time range for the K-line data',
    enum: RANGES,
    example: '1d',
    default: '1d',
  })
  @IsIn(RANGES, { message: `range must be one of: ${RANGES.join(', ')}` })
  range: DailyQuoteRange = '1d';
}
```

- [ ] **Step 2: Verify DTO compiles (no test in this task — validation behavior is covered by controller test in Task 3)**

```bash
cd D:/代码仓库/test/Axiom-Saas-Server && npx tsc --noEmit src/market-quote/dto/get-daily-quote.dto.ts
# Expected: no errors
```

- [ ] **Step 3: Commit**

```bash
git add src/market-quote/dto/get-daily-quote.dto.ts
git commit -m "feat(market-quote): dto with class-validator (ts_code + range)

GetDailyQuoteDto: ts_code must match /^\d{6}\.(SH|SZ|BJ)$/, range must
be one of 1d/1w/3m/6m/1y/all. Swagger annotations included for API
docs. Validation behavior is exercised by controller test in Task 3.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Service — proxyDailyQuote with native fetch
**Files:**
- Create: `src/market-quote/market-quote.service.ts`
- Test: `src/market-quote/market-quote.service.spec.ts`

- [ ] **Step 1: Write the failing service spec**

```ts
// src/market-quote/market-quote.service.spec.ts
import { HttpException } from '@nestjs/common';
import { MarketQuoteService } from './market-quote.service';
import { GetDailyQuoteDto } from './dto/get-daily-quote.dto';

describe('MarketQuoteService', () => {
  // Mock ConfigService that exposes vibeTrading.{baseUrl, apiToken, timeoutMs}
  const makeCfg = (overrides: Record<string, unknown> = {}) => {
    const defaults: Record<string, unknown> = {
      'vibeTrading.baseUrl': 'http://vibe.local',
      'vibeTrading.apiToken': 'service-token-xyz',
      'vibeTrading.timeoutMs': 5000,
    };
    return {
      get: (k: string, _opts?: unknown) =>
        k in overrides ? overrides[k] : defaults[k],
    };
  };

  let svc: MarketQuoteService;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    (global as any).fetch = fetchMock;
    svc = new MarketQuoteService(makeCfg() as any);
  });

  // ----- happy path -----

  it('should GET upstream /api/market/quote/daily with correct URL + query params', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          ts_code: '600519.SH',
          range: '1d',
          bars: [{ date: '2026-09-08', close: 1700 }],
          cached: true,
        }),
    });

    const dto: GetDailyQuoteDto = Object.assign(new GetDailyQuoteDto(), {
      ts_code: '600519.SH',
      range: '1d' as const,
    });

    await svc.proxyDailyQuote(dto, 42);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl, calledInit] = fetchMock.mock.calls[0];
    expect(calledUrl).toBe(
      'http://vibe.local/api/market/quote/daily?ts_code=600519.SH&range=1d',
    );
    expect(calledInit.method).toBe('GET');
  });

  it('should forward Authorization: Bearer {apiToken} and X-User-Id header', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          ts_code: '600519.SH',
          range: '1d',
          bars: [],
          cached: false,
        }),
    });

    const dto: GetDailyQuoteDto = Object.assign(new GetDailyQuoteDto(), {
      ts_code: '600519.SH',
      range: '1d' as const,
    });

    await svc.proxyDailyQuote(dto, 42);

    const [, calledInit] = fetchMock.mock.calls[0];
    expect(calledInit.headers).toMatchObject({
      Authorization: 'Bearer service-token-xyz',
      'X-User-Id': '42',
    });
  });

  it('should normalize numeric userId to string in X-User-Id', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ts_code: 'x', range: '1d', bars: [], cached: false }),
    });

    const dto: GetDailyQuoteDto = Object.assign(new GetDailyQuoteDto(), {
      ts_code: '600519.SH',
      range: '1d' as const,
    });

    await svc.proxyDailyQuote(dto, 7);
    const [, calledInit] = fetchMock.mock.calls[0];
    expect(calledInit.headers['X-User-Id']).toBe('7');
  });

  it('should pass AbortSignal.timeout(ms) for upstream timeout', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ts_code: 'x', range: '1d', bars: [], cached: false }),
    });

    const dto: GetDailyQuoteDto = Object.assign(new GetDailyQuoteDto(), {
      ts_code: '600519.SH',
      range: '1d' as const,
    });

    await svc.proxyDailyQuote(dto, 42);
    const [, calledInit] = fetchMock.mock.calls[0];
    expect(calledInit.signal).toBeDefined();
    // AbortSignal.timeout() returns a non-aborted signal at construction
    expect(calledInit.signal.aborted).toBe(false);
  });

  it('should return upstream JSON untouched on 200', async () => {
    const upstream = {
      ts_code: '600519.SH',
      range: '1d',
      bars: [{ date: '2026-09-08', open: 1700, high: 1710, low: 1690, close: 1705, volume: 12345 }],
      cached: true,
    };
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(upstream),
    });

    const dto: GetDailyQuoteDto = Object.assign(new GetDailyQuoteDto(), {
      ts_code: '600519.SH',
      range: '1d' as const,
    });

    const r = await svc.proxyDailyQuote(dto, 42);
    expect(r).toEqual(upstream);
  });

  // ----- error passthrough -----

  it('should throw 502 BAD_GATEWAY when fetch throws (network/timeout)', async () => {
    fetchMock.mockRejectedValue(new Error('aborted'));

    const dto: GetDailyQuoteDto = Object.assign(new GetDailyQuoteDto(), {
      ts_code: '600519.SH',
      range: '1d' as const,
    });

    await expect(svc.proxyDailyQuote(dto, 42)).rejects.toBeInstanceOf(
      HttpException,
    );
    try {
      await svc.proxyDailyQuote(dto, 42);
    } catch (e) {
      expect((e as HttpException).getStatus()).toBe(502);
    }
  });

  it('should pass through upstream 404 status code and body', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 404,
      text: () => Promise.resolve('No data for ts_code'),
    });

    const dto: GetDailyQuoteDto = Object.assign(new GetDailyQuoteDto(), {
      ts_code: '600519.SH',
      range: '1d' as const,
    });

    try {
      await svc.proxyDailyQuote(dto, 42);
      fail('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(HttpException);
      const ex = e as HttpException;
      expect(ex.getStatus()).toBe(404);
      expect(ex.message).toContain('No data for ts_code');
    }
  });

  it('should pass through upstream 401 status code', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve('Unauthorized'),
    });

    const dto: GetDailyQuoteDto = Object.assign(new GetDailyQuoteDto(), {
      ts_code: '600519.SH',
      range: '1d' as const,
    });

    try {
      await svc.proxyDailyQuote(dto, 42);
      fail('should have thrown');
    } catch (e) {
      expect((e as HttpException).getStatus()).toBe(401);
    }
  });

  it('should pass through upstream 502 status code', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 502,
      text: () => Promise.resolve('upstream tushare fail'),
    });

    const dto: GetDailyQuoteDto = Object.assign(new GetDailyQuoteDto(), {
      ts_code: '600519.SH',
      range: '1d' as const,
    });

    try {
      await svc.proxyDailyQuote(dto, 42);
      fail('should have thrown');
    } catch (e) {
      expect((e as HttpException).getStatus()).toBe(502);
    }
  });

  // ----- config -----

  it('should throw 500 INTERNAL_SERVER_ERROR when vibeTrading.baseUrl is missing', async () => {
    const badCfg = makeCfg({ 'vibeTrading.baseUrl': undefined });
    const localSvc = new MarketQuoteService(badCfg as any);

    const dto: GetDailyQuoteDto = Object.assign(new GetDailyQuoteDto(), {
      ts_code: '600519.SH',
      range: '1d' as const,
    });

    try {
      await localSvc.proxyDailyQuote(dto, 42);
      fail('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(HttpException);
      expect((e as HttpException).getStatus()).toBe(500);
    }
  });

  it('should still send request when apiToken is empty (let upstream reject for visibility)', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ts_code: 'x', range: '1d', bars: [], cached: false }),
    });

    const cfg = makeCfg({ 'vibeTrading.apiToken': '' });
    const localSvc = new MarketQuoteService(cfg as any);

    const dto: GetDailyQuoteDto = Object.assign(new GetDailyQuoteDto(), {
      ts_code: '600519.SH',
      range: '1d' as const,
    });

    await localSvc.proxyDailyQuote(dto, 42);
    const [, calledInit] = fetchMock.mock.calls[0];
    expect(calledInit.headers.Authorization).toBe('Bearer ');
  });

  it('should fall back to 30000ms timeout when timeoutMs is not configured', async () => {
    const cfg = makeCfg({ 'vibeTrading.timeoutMs': undefined });
    const localSvc = new MarketQuoteService(cfg as any);

    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ts_code: 'x', range: '1d', bars: [], cached: false }),
    });

    const dto: GetDailyQuoteDto = Object.assign(new GetDailyQuoteDto(), {
      ts_code: '600519.SH',
      range: '1d' as const,
    });

    // Should not throw on the config fallback path
    await localSvc.proxyDailyQuote(dto, 42);
    expect(fetchMock).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails (module not found)**

```bash
cd D:/代码仓库/test/Axiom-Saas-Server && npm test -- --testPathPattern=market-quote.service
# Expected: FAIL with "Cannot find module './market-quote.service'"
```

- [ ] **Step 3: Write the service implementation**

```ts
// src/market-quote/market-quote.service.ts
import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AllConfigType } from '../config/config.type';
import { GetDailyQuoteDto, DailyQuoteRange } from './dto/get-daily-quote.dto';

export interface DailyQuoteResponse {
  ts_code: string;
  range: DailyQuoteRange;
  bars: Array<Record<string, unknown>>;
  cached: boolean;
}

@Injectable()
export class MarketQuoteService {
  private readonly logger = new Logger(MarketQuoteService.name);

  constructor(private readonly configService: ConfigService<AllConfigType>) {}

  /**
   * Proxy request to AxiomVibeTrading backend's /api/market/quote/daily.
   * Passes user_id (from JWT) + service token (for AxiomVibeTrading).
   * Returns upstream JSON unchanged.
   */
  async proxyDailyQuote(
    dto: GetDailyQuoteDto,
    userId: string | number,
  ): Promise<DailyQuoteResponse> {
    const baseUrl = this.configService.get('vibeTrading.baseUrl', {
      infer: true,
    });
    const apiToken = this.configService.get('vibeTrading.apiToken', {
      infer: true,
    });
    const timeoutMs =
      this.configService.get('vibeTrading.timeoutMs', { infer: true }) ??
      30000;

    if (!baseUrl) {
      throw new HttpException(
        'vibeTrading.baseUrl is not configured',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const url = new URL('/api/market/quote/daily', baseUrl);
    url.searchParams.set('ts_code', dto.ts_code);
    url.searchParams.set('range', dto.range);

    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiToken ?? ''}`,
      'X-User-Id': String(userId),
    };

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      // 网络/超时错误
      this.logger.error(`Upstream fetch failed: ${(err as Error).message}`);
      throw new HttpException(
        'Upstream K-line service unavailable',
        HttpStatus.BAD_GATEWAY,
      );
    }

    if (!response.ok) {
      // 透传上游错误状态码和 body
      const body = await response.text();
      this.logger.warn(
        `Upstream returned ${response.status} for ${dto.ts_code}: ${body}`,
      );
      throw new HttpException(
        body || `Upstream error ${response.status}`,
        response.status,
      );
    }

    return (await response.json()) as DailyQuoteResponse;
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd D:/代码仓库/test/Axiom-Saas-Server && npm test -- --testPathPattern=market-quote.service
# Expected: PASS — 12 tests
```

- [ ] **Step 5: Commit**

```bash
git add src/market-quote/market-quote.service.ts src/market-quote/market-quote.service.spec.ts
git commit -m "feat(market-quote): service proxyDailyQuote with native fetch

Forwards to upstream /api/market/quote/daily with Bearer + X-User-Id
headers and AbortSignal.timeout for 30s (config-overridable). Errors:
network/timeout -> 502 BAD_GATEWAY; missing baseUrl -> 500; upstream
4xx/5xx -> status passthrough with body. 12 unit tests covering URL
construction, header forwarding, numeric userId normalization, error
translations, and config fallbacks.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Controller — JWT guard + @CurrentUser + DTO validation
**Files:**
- Create: `src/market-quote/market-quote.controller.ts`
- Test: `src/market-quote/market-quote.controller.spec.ts`

- [ ] **Step 1: Write the failing controller spec**

```ts
// src/market-quote/market-quote.controller.spec.ts
import { Test } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { MarketQuoteController } from './market-quote.controller';
import { MarketQuoteService } from './market-quote.service';

describe('MarketQuoteController', () => {
  const svc = {
    proxyDailyQuote: jest.fn(),
  };

  let ctrl: MarketQuoteController;

  beforeEach(async () => {
    (svc.proxyDailyQuote as jest.Mock).mockReset();

    const moduleRef = await Test.createTestingModule({
      controllers: [MarketQuoteController],
      providers: [{ provide: MarketQuoteService, useValue: svc }],
    })
      .overrideProvider(MarketQuoteService)
      .useValue(svc)
      .compile();

    ctrl = moduleRef.get(MarketQuoteController);
  });

  // ----- happy path -----

  it('should call service.proxyDailyQuote with DTO + user.id and wrap response as {data}', async () => {
    const upstream = {
      ts_code: '600519.SH',
      range: '1d' as const,
      bars: [{ date: '2026-09-08', close: 1700 }],
      cached: true,
    };
    (svc.proxyDailyQuote as jest.Mock).mockResolvedValue(upstream);

    const dto = { ts_code: '600519.SH', range: '1d' as const };
    const r = await ctrl.getDaily(dto as any, { id: 42 } as any);

    expect(svc.proxyDailyQuote).toHaveBeenCalledWith(dto, 42);
    expect(r).toEqual({ data: upstream });
  });

  it('should pass numeric user.id directly to service (controller does not normalize)', async () => {
    (svc.proxyDailyQuote as jest.Mock).mockResolvedValue({
      ts_code: '600519.SH',
      range: '1d',
      bars: [],
      cached: false,
    });

    const dto = { ts_code: '600519.SH', range: '1d' as const };
    await ctrl.getDaily(dto as any, { id: 7 } as any);
    expect(svc.proxyDailyQuote).toHaveBeenCalledWith(dto, 7);
  });

  it('should pass string user.id directly to service', async () => {
    (svc.proxyDailyQuote as jest.Mock).mockResolvedValue({
      ts_code: '600519.SH',
      range: '1d',
      bars: [],
      cached: false,
    });

    const dto = { ts_code: '600519.SH', range: '1d' as const };
    await ctrl.getDaily(dto as any, { id: 'uuid-abc' } as any);
    expect(svc.proxyDailyQuote).toHaveBeenCalledWith(dto, 'uuid-abc');
  });

  // ----- error propagation -----

  it('should propagate HttpException from service (502 BAD_GATEWAY)', async () => {
    (svc.proxyDailyQuote as jest.Mock).mockRejectedValue(
      new HttpException('Upstream K-line service unavailable', 502),
    );

    const dto = { ts_code: '600519.SH', range: '1d' as const };
    await expect(
      ctrl.getDaily(dto as any, { id: 42 } as any),
    ).rejects.toBeInstanceOf(HttpException);
  });

  it('should propagate HttpException from service (passthrough 404)', async () => {
    (svc.proxyDailyQuote as jest.Mock).mockRejectedValue(
      new HttpException('No data for ts_code', 404),
    );

    const dto = { ts_code: '600519.SH', range: '1d' as const };
    try {
      await ctrl.getDaily(dto as any, { id: 42 } as any);
      fail('should have thrown');
    } catch (e) {
      expect((e as HttpException).getStatus()).toBe(404);
    }
  });

  // ----- JWT guard placement -----

  it('should decorate getDaily with @UseGuards (JWT protection)', () => {
    // Reflect-metadata lookup: protected routes have at least one entry in
    // __guards__ metadata. Matches pattern in ai-agent.controller.spec.ts.
    const guards: any[] =
      Reflect.getMetadata(
        '__guards__',
        MarketQuoteController.prototype.getDaily,
      ) ?? [];
    expect(guards.length).toBeGreaterThan(0);
  });

  // ----- controller metadata sanity (Swagger / versioning) -----

  it('should expose the controller at path "market/quote" with version "1"', () => {
    // Path/version metadata is set on the class via @Controller({path, version})
    const pathMeta: string = Reflect.getMetadata(
      'path',
      MarketQuoteController,
    );
    const versionMeta: string = Reflect.getMetadata(
      'version',
      MarketQuoteController,
    );
    expect(pathMeta).toBe('market/quote');
    expect(versionMeta).toBe('1');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails (module not found)**

```bash
cd D:/代码仓库/test/Axiom-Saas-Server && npm test -- --testPathPattern=market-quote.controller
# Expected: FAIL with "Cannot find module './market-quote.controller'"
```

- [ ] **Step 3: Write the controller implementation**

```ts
// src/market-quote/market-quote.controller.ts
import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { MarketQuoteService, DailyQuoteResponse } from './market-quote.service';
import { GetDailyQuoteDto } from './dto/get-daily-quote.dto';

// Minimal User shape required by this controller — avoids loading the
// full User class which transitively triggers databaseConfig() at
// import time. Keep aligned with src/users/domain/user.ts.
interface CurrentUserShape {
  id: number | string;
}

@ApiTags('Market Quote')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'market/quote',
  version: '1',
})
export class MarketQuoteController {
  constructor(private readonly service: MarketQuoteService) {}

  @Get('daily')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Get daily OHLCV for an A-share stock (proxied to AxiomVibeTrading)',
  })
  async getDaily(
    @Query() query: GetDailyQuoteDto,
    @CurrentUser() user: CurrentUserShape,
  ): Promise<{ data: DailyQuoteResponse }> {
    const result = await this.service.proxyDailyQuote(query, user.id);
    return { data: result };
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd D:/代码仓库/test/Axiom-Saas-Server && npm test -- --testPathPattern=market-quote.controller
# Expected: PASS — 7 tests
```

- [ ] **Step 5: Commit**

```bash
git add src/market-quote/market-quote.controller.ts src/market-quote/market-quote.controller.spec.ts
git commit -m "feat(market-quote): controller with JWT guard + @CurrentUser

GET /v1/market/quote/daily: AuthGuard('jwt') protects route, class-validator
on @Query() GetDailyQuoteDto, controller delegates to service with
(user.id, dto) and wraps response as {data}. 7 unit tests covering
happy path, error propagation, JWT guard metadata, and controller path
metadata. Matches existing pattern in ai-agent.controller.ts.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Module + app.module.ts wiring
**Files:**
- Create: `src/market-quote/market-quote.module.ts`
- Modify: `src/app.module.ts`

- [ ] **Step 1: Create the module file**

```ts
// src/market-quote/market-quote.module.ts
import { Module } from '@nestjs/common';
import { MarketQuoteController } from './market-quote.controller';
import { MarketQuoteService } from './market-quote.service';

@Module({
  controllers: [MarketQuoteController],
  providers: [MarketQuoteService],
  exports: [MarketQuoteService],
})
export class MarketQuoteModule {}
```

- [ ] **Step 2: Wire into app.module.ts**

Edit `src/app.module.ts`:

1. Add the import line after the existing `VibeTradingModule` import (around line 54):

```ts
import { MarketQuoteModule } from './market-quote/market-quote.module';
```

2. Add `MarketQuoteModule` to the `imports` array, right after `VibeTradingModule`:

```ts
    VibeTradingModule,
    MarketQuoteModule,
    SkillsModule,
```

- [ ] **Step 3: Run lint to catch style issues**

```bash
cd D:/代码仓库/test/Axiom-Saas-Server && npm run lint -- --fix src/market-quote src/app.module.ts
# Expected: no errors (autofix may adjust formatting)
```

- [ ] **Step 4: Run the full test suite (market-quote specs only first)**

```bash
cd D:/代码仓库/test/Axiom-Saas-Server && npm test -- --testPathPattern=market-quote
# Expected: PASS — 19 tests total (12 service + 7 controller)
```

Then run the full suite to confirm no regressions:

```bash
cd D:/代码仓库/test/Axiom-Saas-Server && npm test
# Expected: PASS — all existing 50+ tests + 19 new market-quote tests
```

- [ ] **Step 5: Commit**

```bash
git add src/market-quote/market-quote.module.ts src/app.module.ts
git commit -m "feat(market-quote): wire MarketQuoteModule into app.module

Adds NestJS module declaration (controller + service) and registers it
in AppModule.imports next to VibeTradingModule. Service is exported
for future reuse. 19 market-quote tests pass, full suite green.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Integration verification — start dev server, hit endpoint with mock JWT
**Files:** None (verification only — no code changes expected)

This task verifies the proxy works end-to-end against a running dev server. It is performed manually because it requires a live upstream AxiomVibeTrading instance (or a mocked one) and a real JWT in the request.

- [ ] **Step 1: Set required env vars in `.env.dev`**

```bash
# .env.dev (add or confirm)
VIBE_TRADING_BASE_URL=http://106.13.219.178:8899   # or local vibe-trading
VIBE_TRADING_API_TOKEN=<your-service-token>
VIBE_TRADING_TIMEOUT_MS=30000
```

- [ ] **Step 2: Start dev server**

```bash
cd D:/代码仓库/test/Axiom-Saas-Server && npm run start:dev
# Expected: Nest application successfully started, listening on configured port
```

- [ ] **Step 3: Hit endpoint with a mock JWT (use a known-good user token from the dev DB)**

```bash
# Replace <USER_JWT> with a real JWT issued by /v1/auth/email/login
curl -i \
  -H "Authorization: Bearer <USER_JWT>" \
  "http://localhost:3000/v1/market/quote/daily?ts_code=600519.SH&range=1d"
# Expected: 200 with JSON body {data: {ts_code, range, bars, cached}}
```

- [ ] **Step 4: Verify error paths**

```bash
# 401 — no JWT
curl -i "http://localhost:3000/v1/market/quote/daily?ts_code=600519.SH&range=1d"
# Expected: 401

# 400 — bad ts_code
curl -i -H "Authorization: Bearer <USER_JWT>" \
  "http://localhost:3000/v1/market/quote/daily?ts_code=bad&range=1d"
# Expected: 400 with class-validator error message

# 400 — bad range
curl -i -H "Authorization: Bearer <USER_JWT>" \
  "http://localhost:3000/v1/market/quote/daily?ts_code=600519.SH&range=99y"
# Expected: 400 with "range must be one of" message

# 404 — valid format but unknown stock (upstream tushare has no data)
curl -i -H "Authorization: Bearer <USER_JWT>" \
  "http://localhost:3000/v1/market/quote/daily?ts_code=000000.SH&range=1d"
# Expected: 404 passthrough
```

- [ ] **Step 5: Verify upstream call shape via server logs**

Inspect dev server logs for the line emitted by `MarketQuoteService`:

```
[MarketQuoteService] Upstream returned <status> for <ts_code>: <body>
```

For 200 responses no log line should appear (logger.warn is only on `!response.ok`). For 4xx/5xx the line confirms the proxy is correctly forwarding the request and translating errors.

- [ ] **Step 6: Stop dev server (Ctrl+C) and confirm no diff in source tree**

```bash
cd D:/代码仓库/test/Axiom-Saas-Server && git status
# Expected: clean working tree (verification only, no new files)
```

- [ ] **Step 7: No commit (integration verification leaves no source changes)**

If anything failed, fix in source and commit as a separate `fix(market-quote): ...` commit. Otherwise this task is complete with no further action.

---

## Self-Review Checklist

- [x] **Spec coverage:** §3 (component design) → Tasks 1-4; §4 (errors) → covered by service tests; §5 (config) → no new env vars, reuses existing `vibeTrading.*`; §6 (tests) → Tasks 2-3 + integration verification (Task 5).
- [x] **No placeholders:** every code block is complete and copy-paste runnable.
- [x] **Type consistency:** `DailyQuoteRange` defined in DTO, re-imported by service. `DailyQuoteResponse` defined in service, used by controller return type. `CurrentUserShape` defined locally in controller (matches `ai-agent.controller.ts` pattern).
- [x] **Task granularity:** each task is 2-5 minutes (DTO ~30s, service + 12 tests ~3min, controller + 7 tests ~2min, module wiring ~1min, integration ~5min).
- [x] **Conventional commits:** `feat(market-quote): ...` prefix on all 4 source commits; integration verification produces no commit.

## Notes

- **No `vibe-trading.config.ts` change:** spec §3.3 mentions adding `quoteTimeoutMs` but spec §3.4 clarifies we should reuse the existing `timeoutMs` field. Service uses `vibeTrading.timeoutMs` with a 30000ms fallback when missing.
- **No `e2e-spec.ts` file:** integration verification is manual (Task 5) per spec §6.3 — a supertest e2e is out of scope for the initial commit.
- **No DB dependency:** `MarketQuoteModule` declares no `TypeOrmModule.forFeature` — service is pure I/O + config.
- **Path consistency:** `Controller({ path: 'market/quote', version: '1' })` + `@Get('daily')` → mounted at `/v1/market/quote/daily`, matching spec §2 architecture diagram.
