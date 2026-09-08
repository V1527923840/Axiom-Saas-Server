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
    // Path/version metadata is set on the class via @Controller({path, version}).
    // NestJS stores the version under key '__version__' (see
    // node_modules/@nestjs/common/constants.js: VERSION_METADATA = '__version__').
    const pathMeta: string = Reflect.getMetadata(
      'path',
      MarketQuoteController,
    );
    const versionMeta: string = Reflect.getMetadata(
      '__version__',
      MarketQuoteController,
    );
    expect(pathMeta).toBe('market/quote');
    expect(versionMeta).toBe('1');
  });
});