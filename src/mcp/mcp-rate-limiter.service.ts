import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AllConfigType } from '../config/config.type';

/**
 * One caller's rate-limit state.
 *
 * `tokens` is the current bucket level, `capacity` the burst ceiling and
 * `lastRefillMs` the timestamp the bucket was last refilled.
 */
interface TokenBucket {
  tokens: number;
  capacity: number;
  lastRefillMs: number;
}

/**
 * Per-caller throttling for the MCP endpoint.
 *
 * ## Why this exists
 *
 * Without it, a single leaked API key can be used to drive the MCP
 * endpoint arbitrarily hard. Each `search_intelligence` call runs an
 * `ILIKE '%kw%'` scan over `zsxq_posts.title` (a `text` column with no
 * usable index), so request volume translates directly into database
 * load — an amplification path from a cheap HTTP request to an expensive
 * sequential scan.
 *
 * ## Design
 *
 * - **Token bucket per caller**, not a global limit. One abusive client
 *   must not be able to starve the other users sharing the endpoint.
 * - The bucket key is the caller identity (API key fingerprint or JWT
 *   subject), so limits are attributed per credential.
 * - **Global concurrency cap** on top of the per-caller rate limit: a
 *   single caller may still open many connections concurrently, which
 *   would exhaust the TypeORM connection pool regardless of request rate.
 * - State is in-process. With multiple app instances behind a load
 *   balancer each instance enforces its own budget, so the effective
 *   limit is `instances × perCallerLimit`. The Nginx `limit_req` block in
 *   the deployment docs is the shared-state layer for that case.
 *
 * The token-bucket shape mirrors `skills/internal-skill-tool.service.ts`,
 * which already rate-limits skill tool calls in this project.
 */
@Injectable()
export class McpRateLimiterService {
  private readonly logger = new Logger(McpRateLimiterService.name);

  /** Per-caller token buckets, keyed by caller identity. */
  private readonly buckets = new Map<string, TokenBucket>();

  /** Number of tool calls currently in flight, globally. */
  private inFlight = 0;

  constructor(private readonly configService: ConfigService<AllConfigType>) {}

  private rateLimitRps(): number {
    return this.configService.get('mcp.rateLimitRps', { infer: true }) ?? 5;
  }

  private burstCapacity(): number {
    return this.configService.get('mcp.rateLimitBurst', { infer: true }) ?? 10;
  }

  private maxConcurrency(): number {
    return this.configService.get('mcp.maxConcurrency', { infer: true }) ?? 4;
  }

  /**
   * Charge one token to `callerId`'s bucket.
   *
   * @throws TooManyRequestsException-like HttpException (429) when the
   *         caller is over its budget.
   */
  consume(callerId: string): void {
    const rps = this.rateLimitRps();
    const capacity = this.burstCapacity();
    const now = Date.now();

    let bucket = this.buckets.get(callerId);
    if (!bucket) {
      bucket = { tokens: capacity, capacity, lastRefillMs: now };
      this.buckets.set(callerId, bucket);
    }

    const elapsed = (now - bucket.lastRefillMs) / 1000;
    bucket.tokens = Math.min(bucket.capacity, bucket.tokens + elapsed * rps);
    bucket.lastRefillMs = now;

    if (bucket.tokens < 1) {
      throw new McpRateLimitException(
        `MCP rate limit exceeded (${rps} rps, burst ${capacity}). ` +
          `Retry after a short backoff.`,
      );
    }

    bucket.tokens -= 1;
  }

  /**
   * Reserve a global concurrency slot.
   *
   * @returns A release function that MUST be called when the call ends.
   */
  acquireSlot(): () => void {
    const limit = this.maxConcurrency();
    if (this.inFlight >= limit) {
      throw new McpRateLimitException(
        `MCP concurrency limit reached (${limit} in-flight calls). ` +
          `Retry after a short backoff.`,
      );
    }
    this.inFlight += 1;

    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.inFlight = Math.max(0, this.inFlight - 1);
    };
  }

  /**
   * Drop buckets for callers that have been idle for a while.
   *
   * Without this the map grows one entry per distinct credential forever,
   * which is itself a slow memory leak when many keys are issued.
   */
  pruneIdleBuckets(maxIdleMs = 10 * 60 * 1000): void {
    const cutoff = Date.now() - maxIdleMs;
    for (const [key, bucket] of this.buckets) {
      if (bucket.lastRefillMs < cutoff) {
        this.buckets.delete(key);
      }
    }
  }

  /** Current in-flight call count — exposed for tests and diagnostics. */
  get inFlightCount(): number {
    return this.inFlight;
  }
}

/**
 * Thrown when a caller exceeds its rate or concurrency budget.
 *
 * Carries HTTP 429 so the MCP client's HTTP layer sees the correct
 * status, while the tool-call path converts it into a readable
 * `isError` result.
 */
export class McpRateLimitException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'McpRateLimitException';
  }
}
