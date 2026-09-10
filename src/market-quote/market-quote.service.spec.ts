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

  // ----- custom date range -----

  it('passes start_date and end_date to upstream when provided', async () => {
    const upstream = {
      ts_code: '600519.SH',
      range: 'all',
      bars: [],
      cached: false,
    };
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(upstream),
    });

    const dto: GetDailyQuoteDto = Object.assign(new GetDailyQuoteDto(), {
      ts_code: '600519.SH',
      range: 'all' as const,
      start_date: '2026-01-01',
      end_date: '2026-09-09',
    });

    await svc.proxyDailyQuote(dto, 42);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl] = fetchMock.mock.calls[0];
    expect(calledUrl).toBe(
      'http://vibe.local/api/market/quote/daily?ts_code=600519.SH&range=all&start_date=2026-01-01&end_date=2026-09-09',
    );
  });

  it('omits start_date / end_date query params when not provided', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          ts_code: '600519.SH',
          range: '3m',
          bars: [],
          cached: false,
        }),
    });

    const dto: GetDailyQuoteDto = Object.assign(new GetDailyQuoteDto(), {
      ts_code: '600519.SH',
      range: '3m' as const,
    });

    await svc.proxyDailyQuote(dto, 42);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl] = fetchMock.mock.calls[0];
    expect(calledUrl).toBe(
      'http://vibe.local/api/market/quote/daily?ts_code=600519.SH&range=3m',
    );
    expect(calledUrl).not.toContain('start_date=');
    expect(calledUrl).not.toContain('end_date=');
  });
});