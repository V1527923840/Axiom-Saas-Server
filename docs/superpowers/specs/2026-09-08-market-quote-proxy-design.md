# Market Quote Proxy · 设计 Spec

> **Status**: Draft, pending user review
> **Date**: 2026-09-08
> **Scope**: 1 个 NestJS 模块 (`MarketQuoteModule`) + 1 controller + 1 service + 1 DTO + 1 config 段 + 2 测试文件
> **Target branch**: `feature/market-quote-proxy`
> **Rollback**: 删除新增文件 + 从 `app.module.ts` 移除 `MarketQuoteModule` 即可
> **Spec source**: 镜像自 AxiomVibeTrading spec `docs/superpowers/specs/2026-09-07-stock-link-kchart-design.md`

---

## 1. 背景与目标

### 1.1 现状

Axiom-Saas-Web 前端 vibe-trading feature 渲染 agent 回答时,会显示 `[name](stock:ts_code)` 链接(由 AxiomVibeTrading LLM 生成)。前端需要点击该链接后弹出 K 线图,但 SaasWeb 当前的 API base 指向 Axiom-Saas-Server(本次项目),后者**没有** K线数据接口。

**关键事实:**
- AxiomVibeTrading 后端已有 `/api/market/quote/daily` endpoint(commits 67f8347..1c549d8),含完整 Redis 缓存层
- 本项目已用 `vibeTrading.apiToken` 做 service-to-service 鉴权(`vibe-client.service.ts:26`)
- 前端 chip 点击 → 调用 `{VITE_API_BASE_URL}/v1/market/quote/daily?ts_code=...&range=...`(需新增 endpoint)

### 1.2 目标

1. **轻量代理**:SaasServer 不直接调 tushare,只转发到 AxiomVibeTrading
2. **复用缓存**:多个 SaasWeb 用户查同一只股票 → 命中 AxiomVibeTrading 的 Redis cache
3. **统一鉴权**:SaasServer 用现有 JWT 鉴权(用户层),转发时附加 service token + user_id(AxiomVibeTrading 层)
4. **零依赖新增**:不引入 tushare SDK、Redis、ioredis — 完全透传

### 1.3 显式 non-goals

- ❌ 自行调用 tushare SDK(Redis 缓存 + tushare 集成已在 AxiomVibeTrading 完成)
- ❌ 加 Redis 缓存层(透传命中上游 cache 即可)
- ❌ HK / US K 线(AxiomVibeTrading 后端 regex 限制;AxiomVibeTrading LLM prompt 已约束 LLM 不输出非 A 股链接)
- ❌ 自定义技术指标配置(由前端 ECharts 默认配置)
- ❌ 改 AxiomVibeTrading 后端任何代码

---

## 2. 整体架构

```
┌─────────────────────────────┐
│  Axiom-Saas-Web  (前端)      │
│  点击 chip → fetch K-line   │
└──────────────┬──────────────┘
               │  GET /v1/market/quote/daily?ts_code=...&range=...
               │  Authorization: Bearer {用户 JWT}
               ▼
┌──────────────────────────────────────────────────────────────┐
│  Axiom-Saas-Server  (本次工作)                              │
│                                                              │
│  MarketQuoteController                                      │
│      │                                                       │
│      ▼  AuthGuard('jwt')                                    │
│  MarketQuoteService.proxyDailyQuote(ts_code, range, userId) │
│      │                                                       │
│      │  fetch(GET {VIBE_BASE_URL}/api/market/quote/daily    │
│      │           ?ts_code=...&range=...                     │
│      │           headers: {                                 │
│      │             'Authorization': 'Bearer ' + apiToken,    │
│      │             'X-User-Id': String(userId),              │
│      │           signal: AbortSignal.timeout(30s))          │
│      │                                                       │
│      ▼                                                       │
│  返回 JSON: { ts_code, range, bars, cached }                 │
└──────────────┬───────────────────────────────────────────────┘
               │  (透传 + 鉴权附加)
               ▼
┌──────────────────────────────────────────────────────────────┐
│  AxiomVibeTrading  (上游, 已实现)                            │
│  GET /api/market/quote/daily                                 │
│      ├─ require_auth 验证 (Bearer 或 X-User-Id)            │
│      ├─ ts_code regex (^\d{6}\.(SH|SZ|BJ)$)                 │
│      └─ MarketQuoteService.fetch_daily → Redis → tushare   │
└──────────────────────────────────────────────────────────────┘
```

**关键点:**
- **SaasServer 是 thin pass-through**:只做鉴权 + 透传,不解析、不缓存、不修改响应
- **鉴权双层**:用户层 JWT(给 SaasServer)+ service token(给 AxiomVibeTrading)
- **错误透传**:AxiomVibeTrading 401/404/502 → SaasServer 原样返回

---

## 3. 组件设计

### 3.1 新增文件 (4 个)

| 路径 | 职责 |
|---|---|
| `src/market-quote/market-quote.module.ts` | NestJS 模块声明 |
| `src/market-quote/market-quote.controller.ts` | HTTP controller,接 `/v1/market/quote/daily` |
| `src/market-quote/market-quote.service.ts` | 透传 service(native fetch + Bearer + X-User-Id) |
| `src/market-quote/dto/get-daily-quote.dto.ts` | class-validator DTO(ts_code + range) |

### 3.2 测试文件 (2 个)

| 路径 | 覆盖 |
|---|---|
| `src/market-quote/market-quote.service.spec.ts` | fetch URL 正确 + headers 正确 + 超时/错误透传 |
| `src/market-quote/market-quote.controller.spec.ts` | JWT 拦截 + 参数校验 + 调 service + 返回 JSON |

### 3.3 修改文件 (2 个)

| 路径 | 改动 |
|---|---|
| `src/app.module.ts` | 在 `imports` 数组加 `MarketQuoteModule` |
| `src/config/vibe-trading/vibe-trading.config.ts` | 加可选 `quoteTimeoutMs` 字段(默认 30000) |

### 3.4 关键代码骨架

**`get-daily-quote.dto.ts`:**

```ts
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

**`market-quote.service.ts`:**

```ts
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
      this.configService.get('vibeTrading.quoteTimeoutMs', { infer: true }) ??
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

**`market-quote.controller.ts`:**

```ts
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
    summary: 'Get daily OHLCV for an A-share stock (proxied to AxiomVibeTrading)',
  })
  async getDaily(
    @Query() query: GetDailyQuoteDto,
    @CurrentUser() user: { id: string | number },
  ): Promise<{ data: DailyQuoteResponse }> {
    const result = await this.service.proxyDailyQuote(query, user.id);
    return { data: result };
  }
}
```

**`market-quote.module.ts`:**

```ts
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

**`vibe-trading.config.ts` 新增字段:**

```ts
// 在现有 VibeTradingConfig interface 加:
quoteTimeoutMs?: number;  // optional; defaults to 30000 in service
```

**`app.module.ts` 改动:**

```ts
// 在 imports 数组加:
import { MarketQuoteModule } from './market-quote/market-quote.module';
// ... 加到 imports 列表(位置:跟 vibe-trading 相关的模块放一起)
MarketQuoteModule,
```

---

## 4. 错误处理

| 场景 | SaasServer 行为 | 上游行为 | 用户感知 |
|---|---|---|---|
| 用户 JWT 缺失/失效 | 401 (AuthGuard) | — | 前端跳 `/auth/sign-in`(api.ts 自动) |
| ts_code 格式错(SH/SZ/BJ 之外) | 400 (class-validator) | — | Modal 显示「股票代码格式错误」 |
| range 不在枚举 | 400 (class-validator) | — | Modal 显示「无效 range」 |
| vibeTrading.baseUrl 未配置 | 500 | — | Modal 显示「服务端配置错误」 |
| 上游超时(>30s) | 502 | — | Modal 显示「服务繁忙」+ 重试 |
| 上游返回 401 | 透传 401 | bearer / X-User-Id 校验失败 | 日志告警 + 502 给前端(防止上游内部信息泄漏) |
| 上游返回 404(股票代码无效) | 透传 404 | tushare 无该股票 | Modal 显示「该股票暂无数据」 |
| 上游返回 502(tushare 限流) | 透传 502 | tushare 失败 | Modal 显示「行情服务繁忙」+ 重试 |
| 上游返回 200 正常 | 透传 JSON | cache hit/miss | Modal 渲染图表 |

**降级原则:**
- **任何上游错误都返回非 200** — 前端 Modal 错误状态会展示重试按钮
- **绝不让对话流崩溃** — 这是只读 endpoint,失败不影响 chat
- **日志记录所有 4xx/5xx** — 便于排查 AxiomVibeTrading 上游配置问题

---

## 5. 配置

### 5.1 环境变量(已存在,无需新增)

| 变量 | 用途 | 默认 |
|---|---|---|
| `VIBE_TRADING_BASE_URL` | AxiomVibeTrading backend 地址 | 必填,启动时校验 |
| `VIBE_TRADING_API_TOKEN` | service-to-service 鉴权 token | 必填 |
| `VIBE_TRADING_QUOTE_TIMEOUT_MS`(新增可选)| 上游超时 | 30000 |

### 5.2 配置示例(`.env`)

```bash
# 已有(其他 vibe-trading endpoint 用)
VIBE_TRADING_BASE_URL=https://api.vibetrading.example.com
VIBE_TRADING_API_TOKEN=your-service-account-token

# 新增可选
VIBE_TRADING_QUOTE_TIMEOUT_MS=30000
```

---

## 6. 测试策略

### 6.1 Service 单测(`market-quote.service.spec.ts`)

覆盖:
1. fetch URL 正确构造(`{baseUrl}/api/market/quote/daily?ts_code=...&range=...`)
2. headers 包含 `Authorization: Bearer {apiToken}` 和 `X-User-Id: {userId}`
3. `AbortSignal.timeout(quoteTimeoutMs)` 正确传递
4. 上游 200 → 返回 JSON 给调用方
5. 上游 401/404/502 → 透传 status code + body
6. fetch 抛错(网络/超时)→ 502 BAD_GATEWAY
7. `vibeTrading.baseUrl` 未配置 → 500 INTERNAL_SERVER_ERROR
8. `vibeTrading.apiToken` 未配置 → 仍发送(让上游拒,便于排查配置缺失)

mock: `global.fetch = jest.fn()` 或 `jest.spyOn(global, 'fetch')`

### 6.2 Controller 单测(`market-quote.controller.spec.ts`)

覆盖:
1. AuthGuard('jwt') 生效(无 token → 401)
2. 参数校验失败 → 400(class-validator)
3. 正常调用 → service 被正确传入 DTO + user.id
4. 返回 `{ data: ... }` 包装格式(匹配项目其他 endpoint 风格)

mock: `MarketQuoteService` 用 `jest.createMockFromClass` 或自定义 provider

### 6.3 集成验证(手动)

```bash
cd Axiom-Saas-Server
npm run start:dev
# 浏览器登录 Axiom-Saas-Web,触发 agent 回答含股票名,点击 chip
# DevTools Network 检查:
#   - GET /v1/market/quote/daily?ts_code=600519.SH&range=1d  → 200
#   - Response body 包含 bars 数组
#   - Modal 渲染 ECharts K 线图
```

---

## 7. 文件清单

**新增:**
```
src/market-quote/market-quote.module.ts
src/market-quote/market-quote.controller.ts
src/market-quote/market-quote.service.ts
src/market-quote/dto/get-daily-quote.dto.ts
src/market-quote/market-quote.service.spec.ts
src/market-quote/market-quote.controller.spec.ts
```

**修改:**
```
src/app.module.ts                              # imports 加 MarketQuoteModule
src/config/vibe-trading/vibe-trading.config.ts # interface 加 quoteTimeoutMs 字段
```

**依赖新增:** 无

---

## 8. 范围外

- ❌ SaasServer 自调 tushare(避免重复 Redis 缓存 + tushare SDK)
- ❌ 加 Redis 缓存(直接透传,命中 AxiomVibeTrading 共享 cache)
- ❌ 缓存预热(用户首次访问可能慢一次,后续命中 cache)
- ❌ 多用户配额管理(不在 AxiomVibeTrading 端逻辑范围内)

---

## 9. 风险

| 风险 | 缓解 |
|---|---|
| **AxiomVibeTrading 的 `require_auth` 不接受 Bearer token** | 实施前 read `src/api/security.py:467`;若只接受 `X-User-Id`,当前方案(同时发 Bearer + X-User-Id)仍可工作;若完全 Bearer-only,需调整 |
| **AxiomVibeTrading 升级改了 endpoint 契约** | 双方 spec 都加了"保持一致"约束;若上游改了 JSON 字段,SaasServer 透传会被前端 hook `adaptBars` 兜住(字段缺失 → volume=0)|
| **服务到服务鉴权 token 泄漏** | `VIBE_TRADING_API_TOKEN` 已存于 `.env`,遵循现有 secret 管理规范;SaasServer 本身有 rate limit |
| **上游 AxiomVibeTrading 慢/挂 → SaasServer 同步卡死** | `AbortSignal.timeout(30000)` 强制超时;返回 502 给前端,Modal 显示重试 |
| **CORS / 同源限制** | SaasServer 已有 CORS 配置(vite.config.ts 中前端 base URL 已加白名单);同源请求不需 CORS |

---

## 10. 实施步骤(高层)

1. **DTO**:`get-daily-quote.dto.ts` + class-validator + Swagger 注解
2. **Service**:`market-quote.service.ts` + `proxyDailyQuote` 实现
3. **Controller**:`market-quote.controller.ts` + JWT 守卫 + `@CurrentUser()`
4. **Module**:`market-quote.module.ts` 装配
5. **配置**:`vibe-trading.config.ts` 加 `quoteTimeoutMs` 字段
6. **注册**:在 `app.module.ts` 注册模块
7. **测试**:2 个 spec 文件
8. **手动 E2E**:启动 dev server,验证链路
9. **Commit**:语义化提交(参考 CLAUDE.md 提交规范)

---

**这是 spec 完整设计。请审阅后告诉我:**

1. 整体架构(§2)是否清晰?
2. 组件设计(§3)、错误处理(§4)、配置(§5)、测试(§6)、文件清单(§7)有遗漏/多余项?
3. Module 路径 `src/market-quote/` 是否合适?(也可放 `src/ai-agent/market-quote/`)
4. 默认 30s 超时是否合理?
5. 错误透传策略(§4)是否足够?

确认后我会进入实现计划阶段(writing-plans)。