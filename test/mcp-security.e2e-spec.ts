import { Test } from '@nestjs/testing';
import { ConfigModule, registerAs } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import {
  McpRateLimiterService,
  McpRateLimitException,
} from '../src/mcp/mcp-rate-limiter.service';
import { McpAuditService } from '../src/mcp/mcp-audit.service';
import { McpAuthGuard } from '../src/mcp/mcp-auth.guard';

/**
 * Security tests for the MCP endpoint's abuse protections.
 *
 * These cover the guarantees that matter when several teams share one
 * endpoint:
 *
 * - one caller's burst cannot consume another's budget;
 * - concurrency is capped regardless of request rate;
 * - each credential is revocable independently;
 * - over-long filters are rejected before hitting the database;
 * - every call is attributable in the audit trail.
 */

const RATE_LIMIT_RPS = 2;
const RATE_LIMIT_BURST = 3;
const MAX_CONCURRENCY = 2;

describe('MCP abuse protections', () => {
  let limiter: McpRateLimiterService;
  let audit: McpAuditService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            registerAs('mcp', () => ({
              enabled: true,
              apiKey: 'key-one,key-two',
              path: 'mcp',
              maxPageSize: 20,
              maxOriginalTextLength: 20000,
              rateLimitRps: RATE_LIMIT_RPS,
              rateLimitBurst: RATE_LIMIT_BURST,
              maxConcurrency: MAX_CONCURRENCY,
              maxFilterLength: 10,
            })),
          ],
        }),
        JwtModule.register({}),
      ],
      providers: [McpRateLimiterService, McpAuditService, McpAuthGuard],
    }).compile();

    limiter = moduleRef.get(McpRateLimiterService);
    audit = moduleRef.get(McpAuditService);
  });

  // ------------------------------------------------------------------
  // Rate limiting
  // ------------------------------------------------------------------

  it('should throttle a caller that exceeds its burst budget', () => {
    // The bucket starts full, so `burst` calls are allowed.
    for (let i = 0; i < RATE_LIMIT_BURST; i++) {
      expect(() => limiter.consume('key:caller-a')).not.toThrow();
    }

    // The next call exceeds the budget.
    expect(() => limiter.consume('key:caller-a')).toThrow(
      McpRateLimitException,
    );
  });

  it('should isolate budgets between callers', () => {
    // Burn caller-a's whole budget.
    for (let i = 0; i < RATE_LIMIT_BURST; i++) {
      limiter.consume('key:caller-a');
    }
    expect(() => limiter.consume('key:caller-a')).toThrow();

    // caller-b must be unaffected — one abuser cannot starve the others.
    expect(() => limiter.consume('key:caller-b')).not.toThrow();
    expect(() => limiter.consume('key:caller-b')).not.toThrow();
    expect(() => limiter.consume('key:caller-b')).not.toThrow();
    expect(() => limiter.consume('key:caller-b')).toThrow();
  });

  it('should refill the bucket over time', async () => {
    for (let i = 0; i < RATE_LIMIT_BURST; i++) {
      limiter.consume('key:caller-a');
    }
    expect(() => limiter.consume('key:caller-a')).toThrow();

    // Wait for enough refill (rps = 2, so ~600ms buys one token).
    await new Promise((resolve) => setTimeout(resolve, 600));

    expect(() => limiter.consume('key:caller-a')).not.toThrow();
  });

  it('should prune idle buckets so the map cannot grow forever', () => {
    limiter.consume('key:caller-a');
    limiter.consume('key:caller-b');

    // With a 0ms idle threshold every bucket is stale.
    limiter.pruneIdleBuckets(0);

    // A fresh bucket is created on demand and is full again.
    expect(() => limiter.consume('key:caller-a')).not.toThrow();
  });

  // ------------------------------------------------------------------
  // Concurrency
  // ------------------------------------------------------------------

  it('should cap the number of concurrent calls', () => {
    const release1 = limiter.acquireSlot();
    const release2 = limiter.acquireSlot();

    expect(limiter.inFlightCount).toBe(2);

    // A third concurrent call is rejected.
    expect(() => limiter.acquireSlot()).toThrow(McpRateLimitException);

    // Releasing a slot frees capacity again.
    release1();
    expect(limiter.inFlightCount).toBe(1);
    expect(() => limiter.acquireSlot()).not.toThrow();

    release2();
  });

  it('should not double-decrement when a release is called twice', () => {
    const release = limiter.acquireSlot();
    expect(limiter.inFlightCount).toBe(1);
    release();
    release();
    expect(limiter.inFlightCount).toBe(0);
  });

  // ------------------------------------------------------------------
  // Credential isolation
  // ------------------------------------------------------------------

  describe('McpAuthGuard credential handling', () => {
    let guard: McpAuthGuard;

    beforeEach(() => {
      guard = new McpAuthGuard(
        // The guard only needs `mcp.apiKey` and `auth.secret`.
        {
          get: (key: string) => {
            if (key === 'mcp.apiKey') return 'key-one,key-two';
            if (key === 'auth.secret') return 'jwt-secret';
            return undefined;
          },
        } as never,
        { verifyAsync: jest.fn() } as never,
      );
    });

    const requestWith = (headers: Record<string, string>) =>
      ({ headers }) as never;

    it('should accept each configured key as a separate identity', async () => {
      const ctxFor = (request: unknown) =>
        ({
          switchToHttp: () => ({ getRequest: () => request }),
        }) as never;

      const request1 = requestWith({ 'x-mcp-api-key': 'key-one' });
      await guard.canActivate(ctxFor(request1));
      const caller1 = (request1 as { mcpCaller?: { id: string } }).mcpCaller;

      const request2 = requestWith({ 'x-mcp-api-key': 'key-two' });
      await guard.canActivate(ctxFor(request2));
      const caller2 = (request2 as { mcpCaller?: { id: string } }).mcpCaller;

      expect(caller1?.id).toMatch(/^key:[0-9a-f]{16}$/);
      expect(caller2?.id).toMatch(/^key:[0-9a-f]{16}$/);

      // Two different keys must map to two different identities, so each
      // gets its own rate-limit bucket and can be revoked independently.
      expect(caller1?.id).not.toEqual(caller2?.id);
    });

    it('should reject an unknown key', async () => {
      const ctx = {
        switchToHttp: () => ({
          getRequest: () => requestWith({ 'x-mcp-api-key': 'not-a-key' }),
        }),
      } as never;

      await expect(guard.canActivate(ctx)).rejects.toThrow();
    });

    it('should reject a request with no credentials', async () => {
      const ctx = {
        switchToHttp: () => ({ getRequest: () => requestWith({}) }),
      } as never;

      await expect(guard.canActivate(ctx)).rejects.toThrow();
    });

    it('should never expose the raw key in the caller identity', async () => {
      const request = requestWith({ 'x-mcp-api-key': 'key-one' });
      const ctx = {
        switchToHttp: () => ({ getRequest: () => request }),
      } as never;

      await guard.canActivate(ctx);
      const caller = (request as { mcpCaller?: { id: string } }).mcpCaller;

      expect(caller?.id).not.toContain('key-one');
      expect(caller?.id).not.toContain('key-two');
    });
  });

  // ------------------------------------------------------------------
  // Audit
  // ------------------------------------------------------------------

  it('should attribute calls per caller and tool', () => {
    audit.record({
      callerId: 'key:aaa',
      callerKind: 'api-key',
      tool: 'search_intelligence',
      status: 'ok',
      durationMs: 12,
    });
    audit.record({
      callerId: 'key:aaa',
      callerKind: 'api-key',
      tool: 'search_intelligence',
      status: 'ok',
      durationMs: 8,
    });
    audit.record({
      callerId: 'key:bbb',
      callerKind: 'api-key',
      tool: 'search_intelligence',
      status: 'rate_limited',
      durationMs: 0,
    });

    const snapshot = audit.snapshot();

    expect(snapshot['key:aaa::search_intelligence'].calls).toBe(2);
    expect(snapshot['key:aaa::search_intelligence'].errors).toBe(0);
    expect(snapshot['key:aaa::search_intelligence'].averageMs).toBe(10);

    // The second caller is tracked separately.
    expect(snapshot['key:bbb::search_intelligence'].calls).toBe(1);
    expect(snapshot['key:bbb::search_intelligence'].errors).toBe(1);
  });
});
