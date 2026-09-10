# K-Line Chart 三项修复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** 修 K 线图 3 个问题:X 轴时间顺序反、固定区间改日期范围选择器、图变宽。

**Architecture:**
- **后端**:DTO 加可选 `start_date` / `end_date` (YYYY-MM-DD),service 透传给上游 AxiomVibeTrading Python 服务
- **前端**:Modal 把 6 个区间按钮换成 shadcn/ui `DatePickerWithRange`,KLineChart 把 bars 按时间 ASC 排序,DialogContent 宽度 `max-w-4xl` → `max-w-7xl`
- **依赖**:前端 DatePicker 已经在 `src/components/ui/` 里有(看 `daily-summary` 那块引用过);shadcn/ui 标准组件

**Tech Stack:** NestJS + class-validator + React 19 + shadcn/ui Calendar (react-day-picker) + ECharts + Vitest

**Cross-repo:** 后端 `D:\代码仓库\test\Axiom-Saas-Server` + 前端 `D:\代码仓库\test\Axiom-Saas-Web`(当前目录)

---

## File Structure

| 文件 | 仓库 | 责任 |
|---|---|---|
| `src/market-quote/dto/get-daily-quote.dto.ts` | 后端 | 加 2 个可选日期字段 |
| `src/market-quote/market-quote.service.ts` | 后端 | 把新字段透传到上游 URL |
| `src/market-quote/market-quote.service.spec.ts` | 后端 | 测新字段 |
| `src/features/vibe-trading/lib/vibe-api.ts` | 前端 | `getDailyQuote` 接 start_date/end_date |
| `src/features/vibe-trading/hooks/use-kline-data.ts` | 前端 | hook 接日期范围 |
| `src/features/vibe-trading/components/kline-modal.tsx` | 前端 | 区间按钮 → DatePickerWithRange,加宽 |
| `src/features/vibe-trading/components/kline-chart.tsx` | 前端 | bars 按时间 ASC 排序 |
| `src/features/vibe-trading/components/kline-modal.test.tsx` | 前端 | 测日期范围切换 |
| `src/features/vibe-trading/components/kline-chart.test.tsx` | 前端 | 测排序 |

---

## Task 1: 后端 DTO + service 加日期范围参数

**Files (backend, repo at `D:\代码仓库\test\Axiom-Saas-Server`):**
- Modify: `src/market-quote/dto/get-daily-quote.dto.ts`
- Modify: `src/market-quote/market-quote.service.ts`
- Modify: `src/market-quote/market-quote.service.spec.ts`(添加 case)

- [ ] **Step 1: 更新 DTO,加 2 个可选日期字段**

打开 `src/market-quote/dto/get-daily-quote.dto.ts`,在文件顶部加 `IsOptional` 导入,并在 `GetDailyQuoteDto` 类里 `range` 字段后面追加:

```ts
import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, Matches } from 'class-validator';

const RANGES = ['1d', '1w', '3m', '6m', '1y', 'all'] as const;
export type DailyQuoteRange = (typeof RANGES)[number];

// YYYY-MM-DD 校验
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export class GetDailyQuoteDto {
  // ... ts_code 字段保持不变 ...

  @ApiProperty({
    description: 'Time range for the K-line data',
    enum: RANGES,
    example: '1d',
    default: '1d',
    required: false,
  })
  @IsOptional()
  @IsIn(RANGES, { message: `range must be one of: ${RANGES.join(', ')}` })
  range?: DailyQuoteRange = '1d';

  @ApiProperty({
    description: 'Custom start date (YYYY-MM-DD). Overrides range when provided.',
    example: '2026-01-01',
    required: false,
  })
  @IsOptional()
  @Matches(DATE_RE, {
    message: 'start_date must match YYYY-MM-DD format',
  })
  start_date?: string;

  @ApiProperty({
    description: 'Custom end date (YYYY-MM-DD). Overrides range when provided.',
    example: '2026-09-09',
    required: false,
  })
  @IsOptional()
  @Matches(DATE_RE, {
    message: 'end_date must match YYYY-MM-DD format',
  })
  end_date?: string;
}
```

注意:`range` 现在改成 optional(`?`),默认 '1d' 保留。

- [ ] **Step 2: 更新 service,透传新字段**

打开 `src/market-quote/market-quote.service.ts`,在 `proxyDailyQuote` 方法里 `url.searchParams.set('range', dto.range)` 后面追加:

```ts
    url.searchParams.set('range', dto.range);
    if (dto.start_date) url.searchParams.set('start_date', dto.start_date);
    if (dto.end_date) url.searchParams.set('end_date', dto.end_date);
```

**关于上游兼容性的注释**(放在 `proxyDailyQuote` JSDoc 里):上游 `AxiomVibeTrading` Python 服务需要支持 `start_date` / `end_date` 查询参数。如果上游不支持,会回 422/400,前端需要降级到 client-side 过滤(`range=all` + slice)。

- [ ] **Step 3: 更新 service spec,加 case**

打开 `src/market-quote/market-quote.service.spec.ts`,在 describe 里加 2 个测试:

```ts
  it('passes start_date and end_date to upstream when provided', async () => {
    const dto: GetDailyQuoteDto = {
      ts_code: '600519.SH',
      range: 'all',
      start_date: '2026-01-01',
      end_date: '2026-09-09',
    };
    // ... mock fetch ...
    // assert fetch called with URL containing start_date=2026-01-01 & end_date=2026-09-09
  });

  it('does not include start_date / end_date query params when omitted', async () => {
    const dto: GetDailyQuoteDto = { ts_code: '600519.SH', range: '3m' };
    // assert URL does NOT contain start_date= or end_date=
  });
```

具体 mock 写法参考现有 spec(`market-quote.service.spec.ts` 已有 `proxyDailyQuote` 的测试 pattern)。

- [ ] **Step 4: 跑测试 + tsc**

```bash
cd "D:/代码仓库/test/Axiom-Saas-Server" && ./node_modules/.bin/jest src/market-quote/ 2>&1 | tail -15
cd "D:/代码仓库/test/Axiom-Saas-Server" && ./node_modules/.bin/tsc --noEmit 2>&1 | tail -10
```

Expected: jest 全 PASS(原有 + 新加 2 个),tsc 0 错

- [ ] **Step 5: Commit**

```bash
cd "D:/代码仓库/test/Axiom-Saas-Server" && git add src/market-quote/ && git commit -m "feat(market-quote): accept start_date/end_date for custom K-line range"
```

---

## Task 2: 前端 — getDailyQuote + useKLineData 接日期范围

**Files (frontend, repo at `D:\代码仓库\test\Axiom-Saas-Web`):**
- Modify: `src/features/vibe-trading/lib/vibe-api.ts`
- Modify: `src/features/vibe-trading/hooks/use-kline-data.ts`
- Modify: `src/features/vibe-trading/hooks/use-kline-data.test.ts`(如有)

- [ ] **Step 1: 更新 `vibe-api.ts` 的 `getDailyQuote`**

打开 `src/features/vibe-trading/lib/vibe-api.ts`,修改 `getDailyQuote` 签名 + 实现:

```ts
export type KLineRange = "1d" | "1w" | "3m" | "6m" | "1y" | "all";

export interface KLineQuery {
  ts_code: string;
  range?: KLineRange;
  start_date?: string;  // YYYY-MM-DD
  end_date?: string;    // YYYY-MM-DD
}

export async function getDailyQuote(
  query: KLineQuery,
  options?: { signal?: AbortSignal },
): Promise<DailyQuoteResponse> {
  const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || "";
  const authToken = localStorage.getItem("auth_token");
  const params = new URLSearchParams({ ts_code: query.ts_code });
  // start_date/end_date 优先于 range
  if (query.start_date) params.set("start_date", query.start_date);
  if (query.end_date) params.set("end_date", query.end_date);
  if (query.range) params.set("range", query.range);
  const url = `${API_BASE_URL}/v1/market/quote/daily?${params.toString()}`;
  // ... 其余不变
}
```

- [ ] **Step 2: 更新 `use-kline-data.ts`**

打开 `src/features/vibe-trading/hooks/use-kline-data.ts`,把 hook 签名改为:

```ts
export function useKLineData(query: KLineQuery) {
  // ... 内部把 query.ts_code / query.range / query.start_date / query.end_date 传给 getDailyQuote
  // useEffect 依赖改为 JSON.stringify(query) 或单独依赖 query.ts_code + query.range + query.start_date + query.end_date
}
```

注意:effect deps 必须包含所有传给 getDailyQuote 的字段(否则 date picker 切换不会重新拉)。

- [ ] **Step 3: 更新现有 hook 测试(如有)**

如果 `use-kline-data.test.ts` 存在,把旧的 `useKLineData('600519.SH', '1d')` 改为 `useKLineData({ ts_code: '600519.SH', range: '1d' })`。

- [ ] **Step 4: 跑测试**

```bash
cd "D:/代码仓库/test/Axiom-Saas-Web" && ./node_modules/.bin/vitest run src/features/vibe-trading/hooks/use-kline-data 2>&1 | tail -15
```

Expected: 全 PASS(可能需要修测试)

- [ ] **Step 5: Commit**

```bash
cd "D:/代码仓库/test/Axiom-Saas-Web" && git add src/features/vibe-trading/lib/vibe-api.ts \
        src/features/vibe-trading/hooks/use-kline-data.ts \
        src/features/vibe-trading/hooks/use-kline-data.test.ts
git commit -m "feat(vibe-trading): useKLineData accept start_date/end_date for custom range"
```

---

## Task 3: 前端 — KLineChart bars 按时间 ASC 排序

**Files (frontend):**
- Modify: `src/features/vibe-trading/components/kline-chart.tsx`

- [ ] **Step 1: 在 `useMemo` 里排序**

打开 `src/features/vibe-trading/components/kline-chart.tsx`,修改 `derived` useMemo:

```ts
const derived = useMemo(() => {
  // 后端返回的 bars 可能是 DESC(最新在前),ECharts xAxis.data 需要 ASC
  // 在这里 sort 保证图表左→右 是 旧→新
  const sorted = [...data].sort((a, b) => a.time.localeCompare(b.time));
  const dates = sorted.map((d) => d.time);
  const closes = sorted.map((d) => d.close);
  const opens = sorted.map((d) => d.open);
  const candle = sorted.map((d) => [d.open, d.close, d.low, d.high]);
  const ma5 = ma(closes, 5);
  const ma20 = ma(closes, 20);
  const volume = sorted.map((d, i) => ({
    value: d.volume,
    itemStyle: { color: closes[i] >= opens[i] ? "#ef4444" : "#22c55e" },
  }));
  return { dates, candle, ma5, ma20, volume };
}, [data]);
```

- [ ] **Step 2: 如果有 `kline-chart.test.tsx`,加排序断言**

如果不存在,跳过。如果存在,加一个测试:传入 `[{time:'2026-09-09',...}, {time:'2026-08-05',...}]` (DESC),断言渲染的 xAxis.data 第一项是 `'2026-08-05'`。

- [ ] **Step 3: 跑测试 + commit**

```bash
cd "D:/代码仓库/test/Axiom-Saas-Web" && ./node_modules/.bin/vitest run src/features/vibe-trading/components/kline-chart 2>&1 | tail -15
git add src/features/vibe-trading/components/kline-chart.tsx \
        src/features/vibe-trading/components/kline-chart.test.tsx
git commit -m "fix(vibe-trading): sort K-line bars ascending for correct x-axis order"
```

---

## Task 4: 前端 — KLineModal 加 DatePickerWithRange + 加宽 Dialog

**Files (frontend):**
- Modify: `src/features/vibe-trading/components/kline-modal.tsx`
- Modify: `src/features/vibe-trading/components/kline-modal.test.tsx`(如有,更新断言)

- [ ] **Step 1: 替换 RANGES 按钮为 DatePickerWithRange**

打开 `src/features/vibe-trading/components/kline-modal.tsx`,做以下改动:

**(a) 顶部 imports 增加**(确认这些组件在 `@/components/ui/` 存在;如果不存在,先 `npx shadcn-ui add calendar popover`):

```tsx
import { DatePickerWithRange } from "@/components/date-range-picker";
// 或者:
// import { Calendar } from "@/components/ui/calendar";
// import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
// import { format } from "date-fns";
// import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";
```

**(b) 替换 `RANGES` 数组和 `range` 状态**:

```tsx
// 移除:RANGES 常量 + useState<KLineRange>("1d")

// 新增:用 dateRange 状态,默认最近 3 个月
const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
  const today = new Date();
  const threeMonthsAgo = new Date(today);
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  return { from: threeMonthsAgo, to: today };
});

// 把 dateRange 转成 query 传给 hook
const query = useMemo(() => ({
  ts_code,
  range: "all" as const,
  start_date: dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : undefined,
  end_date: dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined,
}), [ts_code, dateRange]);

const { data, bars, loading, error, retry } = useKLineData(query);
```

**(c) 在 DialogHeader 后插入 DatePickerWithRange UI**:

```tsx
<div className="flex items-center justify-between border-b pb-2">
  <Popover>
    <PopoverTrigger asChild>
      <Button
        variant="outline"
        size="sm"
        className={cn(
          "justify-start text-left font-normal gap-2",
          !dateRange && "text-muted-foreground",
        )}
      >
        <CalendarIcon className="h-4 w-4" />
        {dateRange?.from ? (
          dateRange.to ? (
            <>
              {format(dateRange.from, "yyyy-MM-dd", { locale: zhCN })}
              {" ~ "}
              {format(dateRange.to, "yyyy-MM-dd", { locale: zhCN })}
            </>
          ) : (
            format(dateRange.from, "yyyy-MM-dd", { locale: zhCN })
          )
        ) : (
          <span>选择日期范围</span>
        )}
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-auto p-0" align="start">
      <Calendar
        initialFocus
        mode="range"
        defaultMonth={dateRange?.from}
        selected={dateRange}
        onSelect={setDateRange}
        numberOfMonths={2}
        locale={zhCN}
      />
    </PopoverContent>
  </Popover>
</div>
```

**(d) DialogContent 加宽**:

```tsx
<DialogContent className="max-w-7xl">
```

替换原来的 `max-w-4xl`。

- [ ] **Step 2: 更新测试(如有)**

如果 `kline-modal.test.tsx` 存在,把"RANGES buttons"相关断言改成"日期范围 picker 存在"相关断言。旧的 `screen.getByText("1d")` 会失败,改为 `screen.getByText(/选择日期范围|yyyy-MM-dd/)` 之类的查询。

如果没有该测试文件,跳过。

- [ ] **Step 3: 跑测试 + 跑 build**

```bash
cd "D:/代码仓库/test/Axiom-Saas-Web" && ./node_modules/.bin/vitest run src/features/vibe-trading/components/kline-modal 2>&1 | tail -15
cd "D:/代码仓库/test/Axiom-Saas-Web" && ./node_modules/.bin/tsc -b 2>&1 | tail -10
cd "D:/代码仓库/test/Axiom-Saas-Web" && ./node_modules/.bin/vite build 2>&1 | tail -10
```

Expected: vitest PASS,tsc 0 错,build `built in ...`

- [ ] **Step 4: Commit**

```bash
cd "D:/代码仓库/test/Axiom-Saas-Web" && git add src/features/vibe-trading/components/kline-modal.tsx \
        src/features/vibe-trading/components/kline-modal.test.tsx
git commit -m "feat(vibe-trading): KLineModal DatePickerWithRange + wider dialog"
```

---

## Task 5: 最终验证

- [ ] **Step 1: 后端 lint + 测试**

```bash
cd "D:/代码仓库/test/Axiom-Saas-Server" && ./node_modules/.bin/jest src/market-quote/ 2>&1 | tail -10
cd "D:/代码仓库/test/Axiom-Saas-Server" && ./node_modules/.bin/tsc --noEmit 2>&1 | tail -10
```

- [ ] **Step 2: 前端 lint + 测试 + build**

```bash
cd "D:/代码仓库/test/Axiom-Saas-Web" && ./node_modules/.bin/vitest run 2>&1 | tail -10
cd "D:/代码仓库/test/Axiom-Saas-Web" && ./node_modules/.bin/eslint src/features/vibe-trading/components/kline-modal.tsx src/features/vibe-trading/components/kline-chart.tsx 2>&1 | tail -10
cd "D:/代码仓库/test/Axiom-Saas-Web" && ./node_modules/.bin/tsc -b 2>&1 | tail -5
cd "D:/代码仓库/test/Axiom-Saas-Web" && ./node_modules/.bin/vite build 2>&1 | tail -5
```

- [ ] **Step 3: 整体 commit 概览**

```bash
cd "D:/代码仓库/test/Axiom-Saas-Server" && git log --oneline -2
cd "D:/代码仓库/test/Axiom-Saas-Web" && git log --oneline -4
```

Expected:
- Backend: `feat(market-quote): accept start_date/end_date for custom K-line range`
- Frontend: `feat(vibe-trading): useKLineData accept start_date/end_date ...` + `fix(vibe-trading): sort K-line bars ...` + `feat(vibe-trading): KLineModal DatePickerWithRange + wider dialog`

---

## Acceptance Criteria

1. ✅ 后端 `GET /v1/market/quote/daily?ts_code=X&start_date=Y&end_date=Z` 接受任意日期范围
2. ✅ 后端 DTO 校验日期格式 `YYYY-MM-DD`
3. ✅ 前端 KLineModal 用 DatePickerWithRange(图9那套)
4. ✅ 前端 KLineChart X 轴时间从旧到新(左→右)
5. ✅ 前端 DialogContent 宽度 `max-w-7xl`
6. ✅ 测试 + lint + build 全过
7. ⚠️ **前置条件**:上游 `AxiomVibeTrading` Python 服务需要支持 `start_date` / `end_date` query 参数。如果不支持,前端需要降级:传 `range=all` + 客户端 slice(本 plan 未实现,需要 fallback)

---

## Out of Scope

- 不改 ECharts 主题(后续)
- 不加 MACD/RSI 叠加(v2)
- 不做 client-side fallback(假设上游支持日期)
- 不动 KLineModal 之外的其他 chart 组件